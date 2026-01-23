use anyhow::{Result, Context};
use rsa::{RsaPrivateKey, RsaPublicKey, pkcs8::EncodePublicKey};
use rsa::pkcs8::LineEnding;
use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::config::AgentConfig;
use crate::system::SystemInfo;

const RSA_BITS: usize = 2048;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct EnrollmentRequest {
    hostname: String,
    os: String,
    os_version: String,
    architecture: String,
    ip_address: String,
    mac_address: String,
    public_key: String,
    version: String,
    enrollment_token: String,
}

#[derive(Debug, Deserialize)]
struct EnrollmentResponse {
    id: String,
    hostname: String,
}

pub struct Enrollment {
    config: AgentConfig,
    http_client: reqwest::Client,
}

impl Enrollment {
    pub fn new(config: AgentConfig) -> Self {
        let http_client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            config,
            http_client,
        }
    }

    /// Enroll the agent with the server
    pub async fn enroll(&self) -> Result<String> {
        log::info!("Starting agent enrollment...");

        // Check if enrollment token is provided
        let enrollment_token = self.config.enrollment_token.as_ref()
            .context("Enrollment token not found in configuration")?;

        // Collect system information
        let system_info = SystemInfo::collect()
            .context("Failed to collect system information")?;

        // Generate RSA key pair
        log::info!("Generating RSA key pair...");
        let (private_key, public_key) = self.generate_key_pair()
            .context("Failed to generate RSA key pair")?;

        // Encode public key to PEM
        let public_key_pem = public_key.to_public_key_pem(LineEnding::LF)
            .context("Failed to encode public key to PEM")?;

        // Prepare enrollment request
        let request = EnrollmentRequest {
            hostname: system_info.hostname.clone(),
            os: format!("{:?}", system_info.os).to_uppercase(),
            os_version: system_info.os_version.clone(),
            architecture: system_info.architecture.clone(),
            ip_address: system_info.ip_address.clone(),
            mac_address: system_info.mac_address.clone(),
            public_key: public_key_pem,
            version: env!("CARGO_PKG_VERSION").to_string(),
            enrollment_token: enrollment_token.clone(),
        };

        // Send enrollment request
        log::info!("Sending enrollment request to server...");
        let url = format!("{}/agents/enroll", self.config.server_url);

        let response = self.http_client
            .post(&url)
            .json(&request)
            .send()
            .await
            .context("Failed to send enrollment request")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            anyhow::bail!("Enrollment failed with status {}: {}", status, error_text);
        }

        let enrollment_response: EnrollmentResponse = response.json().await
            .context("Failed to parse enrollment response")?;

        log::info!("Agent enrolled successfully with ID: {}", enrollment_response.id);

        // Save private key (certificate)
        self.save_private_key(&private_key)
            .context("Failed to save private key")?;

        Ok(enrollment_response.id)
    }

    /// Generate RSA key pair
    fn generate_key_pair(&self) -> Result<(RsaPrivateKey, RsaPublicKey)> {
        let mut rng = rand::thread_rng();
        let private_key = RsaPrivateKey::new(&mut rng, RSA_BITS)
            .context("Failed to generate RSA private key")?;
        let public_key = RsaPublicKey::from(&private_key);
        Ok((private_key, public_key))
    }

    /// Save private key to file
    fn save_private_key(&self, private_key: &RsaPrivateKey) -> Result<()> {
        use rsa::pkcs8::EncodePrivateKey;

        let pem = private_key.to_pkcs8_pem(LineEnding::LF)
            .context("Failed to encode private key to PEM")?;

        // Create parent directory if it doesn't exist
        if let Some(parent) = self.config.cert_path.parent() {
            std::fs::create_dir_all(parent)
                .context("Failed to create certificate directory")?;
        }

        std::fs::write(&self.config.cert_path, pem.as_bytes())
            .context("Failed to write private key to file")?;

        // Set file permissions (Unix only)
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&self.config.cert_path)?.permissions();
            perms.set_mode(0o600); // rw-------
            std::fs::set_permissions(&self.config.cert_path, perms)?;
        }

        log::info!("Private key saved to: {:?}", self.config.cert_path);

        Ok(())
    }

    /// Check if private key exists
    pub fn has_private_key(&self) -> bool {
        Path::new(&self.config.cert_path).exists()
    }
}
