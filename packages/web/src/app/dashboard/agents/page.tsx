'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { agentsApi, Agent } from '@/lib/api/agents';
import { useSocket } from '@/hooks/useSocket';

export default function AgentsPage() {
  const router = useRouter();
  const { user: currentUser, isAuthenticated, refreshUser } = useAuthStore();
  const { socket, isConnected } = useSocket();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    refreshUser().then(() => {
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        loadAgents();
      }
    });
  }, [isAuthenticated, refreshUser, router]);

  // WebSocket event listeners
  useEffect(() => {
    if (!socket) return;

    // Subscribe to agent updates
    socket.emit('subscribe:agents');

    // Listen for agent status updates
    socket.on('agent:status', (data: { agentId: string; status: string }) => {
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === data.agentId ? { ...agent, status: data.status as any } : agent
        )
      );
    });

    // Listen for agent heartbeat
    socket.on('agent:heartbeat', (data: any) => {
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === data.agentId
            ? {
                ...agent,
                status: data.status,
                metadata: {
                  ...agent.metadata,
                  cpuUsage: data.cpuUsage,
                  memoryUsage: data.memoryUsage,
                  diskUsage: data.diskUsage,
                },
                lastSeenAt: data.timestamp,
              }
            : agent
        )
      );
    });

    // Listen for new agents enrolled
    socket.on('agent:enrolled', (data: { agent: Agent }) => {
      setAgents((prev) => [data.agent, ...prev]);
    });

    // Listen for agent deleted
    socket.on('agent:deleted', (data: { agentId: string }) => {
      setAgents((prev) => prev.filter((agent) => agent.id !== data.agentId));
    });

    return () => {
      socket.emit('unsubscribe:agents');
      socket.off('agent:status');
      socket.off('agent:heartbeat');
      socket.off('agent:enrolled');
      socket.off('agent:deleted');
    };
  }, [socket]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const response = await agentsApi.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setAgents(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadAgents();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      await agentsApi.delete(id);
      loadAgents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete agent');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-green-100 text-green-800';
      case 'OFFLINE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-xl font-bold text-gray-900 hover:text-primary"
              >
                ← MyRemote
              </button>
              <h2 className="text-lg font-semibold">Agents</h2>
              {isConnected && (
                <span className="text-xs text-green-600">● Live</span>
              )}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                {currentUser.firstName} {currentUser.lastName}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <form onSubmit={handleSearch} className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Status</option>
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                >
                  Search
                </button>
              </form>

              <div className="text-sm text-gray-600">
                Total: {agents.length} | Online: {agents.filter(a => a.status === 'ONLINE').length}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-600">Loading agents...</div>
            ) : agents.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No agents found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hostname</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">OS</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {agents.map((agent) => (
                      <tr key={agent.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(agent.status)}`}>
                            {agent.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{agent.hostname}</div>
                          <div className="text-sm text-gray-500">{agent.version}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{agent.os}</div>
                          <div className="text-sm text-gray-500">{agent.osVersion}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {agent.ipAddress}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(agent.lastSeenAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                            className="text-primary hover:text-primary-dark"
                          >
                            View
                          </button>
                          {currentUser.role === 'ADMIN' && (
                            <button
                              onClick={() => handleDelete(agent.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
