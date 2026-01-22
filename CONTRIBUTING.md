# Contributing to MyRemote

Merci de votre intérêt pour contribuer à MyRemote ! 🎉

Ce guide vous aidera à contribuer efficacement au projet.

---

## 📋 Table des Matières

1. [Code of Conduct](#code-of-conduct)
2. [Comment Contribuer](#comment-contribuer)
3. [Workflow Git](#workflow-git)
4. [Standards de Code](#standards-de-code)
5. [Tests](#tests)
6. [Documentation](#documentation)
7. [Pull Request Process](#pull-request-process)

---

## Code of Conduct

### Notre Engagement

Nous nous engageons à créer un environnement accueillant et inclusif pour tous les contributeurs.

### Comportements Attendus

- ✅ Être respectueux et professionnel
- ✅ Accepter les critiques constructives
- ✅ Se concentrer sur ce qui est meilleur pour la communauté
- ✅ Faire preuve d'empathie envers les autres membres

### Comportements Inacceptables

- ❌ Langage offensant ou discriminatoire
- ❌ Harcèlement de quelque nature que ce soit
- ❌ Publication d'informations privées sans permission
- ❌ Conduite non professionnelle

### Application

Les violations peuvent être signalées à : conduct@myremote.example.com

---

## Comment Contribuer

### Types de Contributions

Nous acceptons plusieurs types de contributions :

1. **🐛 Bug Reports**
   - Signaler des bugs via GitHub Issues
   - Utiliser le template de bug report
   - Inclure : steps to reproduce, expected vs actual behavior, logs

2. **✨ Feature Requests**
   - Proposer de nouvelles fonctionnalités
   - Utiliser le template de feature request
   - Expliquer : use case, bénéfices, impacts

3. **💻 Code Contributions**
   - Corriger des bugs
   - Implémenter des features (après discussion)
   - Améliorer la performance
   - Refactoring (si justifié)

4. **📚 Documentation**
   - Améliorer les docs existantes
   - Ajouter des exemples
   - Traduire (si applicable)
   - Corriger typos

5. **🧪 Tests**
   - Ajouter tests unitaires
   - Ajouter tests E2E
   - Améliorer coverage

---

## Workflow Git

### 1. Fork & Clone

```bash
# Fork le repo sur GitHub (bouton Fork)

# Clone votre fork
git clone https://github.com/YOUR_USERNAME/MyRemote.git
cd MyRemote

# Ajouter remote upstream
git remote add upstream https://github.com/wilf974/MyRemote.git
```

### 2. Créer une Branche

```bash
# Sync avec upstream
git fetch upstream
git checkout main
git merge upstream/main

# Créer une branche feature/fix
git checkout -b feature/my-awesome-feature
# OU
git checkout -b fix/bug-description
```

**Convention nommage branches** :
- `feature/description` : Nouvelle fonctionnalité
- `fix/description` : Bug fix
- `docs/description` : Documentation uniquement
- `refactor/description` : Refactoring code
- `test/description` : Ajout tests

### 3. Développer

```bash
# Faire vos modifications

# Tester localement
pnpm lint
pnpm test
pnpm build

# Vérifier que ça fonctionne
pnpm dev
```

### 4. Commit

**Convention Conventional Commits** :

```bash
git commit -m "type(scope): description"
```

**Types** :
- `feat`: Nouvelle fonctionnalité
- `fix`: Bug fix
- `docs`: Documentation uniquement
- `style`: Formatting (pas de changement code logic)
- `refactor`: Refactoring (ni feat ni fix)
- `test`: Ajout tests
- `chore`: Maintenance (deps, config, etc.)
- `perf`: Performance improvement

**Exemples** :
```bash
git commit -m "feat(api): add device enrollment endpoint"
git commit -m "fix(web): correct session timeout calculation"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(api): add unit tests for devices service"
```

**Commits atomiques** :
- Un commit = une modification logique
- Éviter les commits massifs ("fix everything")
- Commit message clair et descriptif

### 5. Push & Pull Request

```bash
# Push votre branche
git push origin feature/my-awesome-feature

# Créer Pull Request sur GitHub
# → Compare & pull request
```

---

## Standards de Code

### TypeScript (Backend/Frontend)

**Style** :
```typescript
// ✅ GOOD
export class DevicesService {
  constructor(private readonly repository: DeviceRepository) {}

  async findAll(filters: DeviceFilters): Promise<Device[]> {
    return await this.repository.find(filters);
  }
}

// ❌ BAD
export class devicesService {
  constructor(private repository: any) {}

  async findAll(filters: any): Promise<any> {
    return this.repository.find(filters);
  }
}
```

**Règles** :
- ✅ Utiliser TypeScript strict mode
- ✅ Typer toutes les fonctions (params + return)
- ✅ Éviter `any` (utiliser `unknown` si nécessaire)
- ✅ Utiliser interfaces/types pour structures de données
- ✅ Préférer `const` à `let`
- ✅ Arrow functions pour callbacks
- ✅ Async/await plutôt que `.then()`

**Linting** :
```bash
# Check
pnpm lint

# Auto-fix
pnpm lint --fix

# Format
pnpm format
```

### Rust (Agent)

**Style** :
```rust
// ✅ GOOD
pub async fn enroll(
    server_url: &str,
    token: &str,
    storage: &Storage,
) -> Result<String, EnrollmentError> {
    let response = send_enrollment_request(server_url, token).await?;
    storage.save_device_id(&response.device_id).await?;
    Ok(response.device_id)
}

// ❌ BAD
pub async fn enroll(server_url: &str, token: &str, storage: &Storage) -> Result<String, Box<dyn std::error::Error>> {
    let response = send_enrollment_request(server_url,token).await?;
    storage.save_device_id(&response.device_id).await?;
    Ok(response.device_id)
}
```

**Règles** :
- ✅ Suivre Rust style guide (rustfmt)
- ✅ Utiliser `Result<T, E>` pour error handling
- ✅ Documenter fonctions publiques (`///`)
- ✅ Éviter `unwrap()` (préférer `?` ou `expect()` avec message)
- ✅ Utiliser `async/await` pour I/O

**Linting** :
```bash
cd packages/agent

# Format
cargo fmt

# Lint
cargo clippy

# Tests
cargo test
```

---

## Tests

### Tests Obligatoires

Toute PR **doit** inclure des tests.

#### Backend (NestJS)

**Tests unitaires** (Jest) :
```typescript
// devices.service.spec.ts
describe('DevicesService', () => {
  let service: DevicesService;
  let repository: MockType<DeviceRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: DeviceRepository, useFactory: mockRepository },
      ],
    }).compile();

    service = module.get(DevicesService);
    repository = module.get(DeviceRepository);
  });

  it('should list devices with filters', async () => {
    const mockDevices = [{ id: '1', hostname: 'PC-001', status: 'online' }];
    repository.find.mockResolvedValue(mockDevices);

    const result = await service.findAll({ status: 'online' });

    expect(result).toEqual(mockDevices);
    expect(repository.find).toHaveBeenCalledWith({ status: 'online' });
  });
});
```

**Tests E2E** :
```typescript
// devices.e2e-spec.ts
describe('Devices (e2e)', () => {
  it('/devices (GET) should return devices list', () => {
    return request(app.getHttpServer())
      .get('/api/v1/devices')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeInstanceOf(Array);
      });
  });
});
```

**Run tests** :
```bash
cd packages/api

# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov

# E2E
pnpm test:e2e
```

#### Frontend (Next.js)

**Tests composants** (Vitest + React Testing Library) :
```typescript
// DeviceStatusBadge.test.tsx
import { render, screen } from '@testing-library/react';
import DeviceStatusBadge from './DeviceStatusBadge';

test('renders online badge correctly', () => {
  render(<DeviceStatusBadge status="online" />);

  const badge = screen.getByText(/online/i);
  expect(badge).toBeInTheDocument();
  expect(badge).toHaveClass('bg-green-500');
});
```

**Run tests** :
```bash
cd packages/web

# Unit tests
pnpm test

# Watch mode
pnpm test:watch
```

#### Agent (Rust)

**Tests unitaires** :
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_enroll_with_valid_token() {
        let storage = Storage::new_in_memory().await.unwrap();
        let result = enroll("http://localhost", "valid_token", &storage).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_enroll_with_expired_token() {
        let storage = Storage::new_in_memory().await.unwrap();
        let result = enroll("http://localhost", "expired_token", &storage).await;

        assert!(result.is_err());
    }
}
```

**Run tests** :
```bash
cd packages/agent

# All tests
cargo test

# Specific test
cargo test test_enroll

# With output
cargo test -- --nocapture
```

### Coverage Requis

- **Minimum** : 70% coverage (global)
- **Critiques** : 90% coverage (auth, RBAC, enrollment, audit)

```bash
# Check coverage
pnpm test:cov

# View HTML report
open coverage/lcov-report/index.html
```

---

## Documentation

### Code Documentation

**Backend (TypeScript)** :
```typescript
/**
 * Liste les devices avec filtres optionnels.
 *
 * @param filters - Filtres de recherche (status, os_type, group_id)
 * @returns Liste de devices correspondant aux filtres
 * @throws NotFoundException si aucun device trouvé
 *
 * @example
 * ```typescript
 * const devices = await service.findAll({ status: 'online' });
 * ```
 */
async findAll(filters: DeviceFilters): Promise<Device[]> {
  // ...
}
```

**Agent (Rust)** :
```rust
/// Enroll un device sur le serveur MyRemote.
///
/// # Arguments
/// * `server_url` - URL du serveur (ex: "https://api.myremote.example.com")
/// * `token` - Token d'enrollment (usage unique, 24h)
/// * `storage` - Storage local pour persister le device_id
///
/// # Returns
/// * `Ok(String)` - Device ID attribué par le serveur
/// * `Err(EnrollmentError)` - Si token invalide ou erreur réseau
///
/// # Example
/// ```
/// let device_id = enroll("http://localhost", "myr_token", &storage).await?;
/// ```
pub async fn enroll(
    server_url: &str,
    token: &str,
    storage: &Storage,
) -> Result<String, EnrollmentError> {
    // ...
}
```

### README & Docs

Si vous ajoutez une fonctionnalité majeure :
- ✅ Mettre à jour `README.md`
- ✅ Mettre à jour `docs/` pertinent
- ✅ Ajouter exemples d'utilisation
- ✅ Mettre à jour API specification si nécessaire

---

## Pull Request Process

### 1. Avant de Soumettre

Checklist :
- [ ] Code lint sans erreur (`pnpm lint`)
- [ ] Tous tests passent (`pnpm test`)
- [ ] Coverage ≥ 70% (nouvelles lignes)
- [ ] Build réussit (`pnpm build`)
- [ ] Documentation mise à jour (si applicable)
- [ ] Commits suivent convention (Conventional Commits)
- [ ] Pas de conflits avec `main`

```bash
# Sync avec upstream
git fetch upstream
git rebase upstream/main

# Si conflits, résoudre puis
git rebase --continue

# Force push (votre branche uniquement !)
git push origin feature/my-feature --force-with-lease
```

### 2. Créer la PR

**Titre** :
- Format : `type(scope): description`
- Exemple : `feat(api): add device enrollment endpoint`

**Description** (utiliser template) :

```markdown
## 🎯 Objectif

[Expliquer pourquoi cette PR existe]

## 📝 Changements

- [Liste des modifications]
- [Une ligne par changement majeur]

## ✅ Checklist

- [ ] Tests ajoutés
- [ ] Documentation mise à jour
- [ ] Linting OK
- [ ] Build OK

## 📸 Screenshots (si UI)

[Ajouter captures d'écran si changements visuels]

## 🔗 Liens

Fixes #123 (si PR résout une issue)
Related to #456 (si lié à une issue)
```

### 3. Review Process

**Ce qui arrive après** :
1. ✅ CI/CD runs automatiquement (lint, test, build)
2. 👀 Reviewer(s) assigned (1-2 personnes)
3. 💬 Commentaires / Questions
4. 🔄 Vous faites les modifications demandées
5. ✅ Approbation (1+ reviewer)
6. 🎉 Merge par maintainer

**Délai review** :
- Petit fix (<50 lignes) : 24h
- Feature moyenne : 2-3 jours
- Feature majeure : 1 semaine

### 4. Après Merge

- ✅ Votre branche sera supprimée automatiquement
- ✅ Vous serez mentionné dans le changelog
- ✅ Vos commits apparaîtront dans l'historique

```bash
# Nettoyer votre branche locale
git checkout main
git pull upstream main
git branch -d feature/my-feature
```

---

## 🏆 Reconnaissance

### Contributors

Tous les contributeurs sont listés dans :
- `README.md` (section Contributors)
- GitHub Contributors page
- Release notes

### Special Thanks

Contributions significatives peuvent être mentionnées dans :
- Blog posts
- Twitter shout-outs
- Annual reports

---

## 📞 Questions ?

Si vous avez des questions :

- 💬 **Discussions** : https://github.com/wilf974/MyRemote/discussions
- 🐛 **Issues** : https://github.com/wilf974/MyRemote/issues
- 📧 **Email** : dev@myremote.example.com
- 💬 **Slack** : #myremote-dev (si accès)

---

## 📚 Ressources Utiles

- [Git Workflow](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Rust Style Guide](https://doc.rust-lang.org/1.0.0/style/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/guide/)

---

**Merci de contribuer à MyRemote ! 🎉**

Votre temps et expertise sont précieux. Chaque contribution, petite ou grande, aide à construire une meilleure plateforme de support à distance.

---

**Dernière mise à jour** : 2026-01-22
**Mainteneurs** : Tech Lead, Core Team
