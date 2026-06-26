import { useState, useEffect } from "react";
import {
  Search,
  Download,
  Eye,
  Activity,
  User,
  Clock,
  Calendar,
  Filter,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  PageHeader,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Modal,
} from "../components/ui";
import { supabase } from "../lib/supabase";

export function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const actions = [
    "all",
    "CREATE",
    "UPDATE",
    "DELETE",
    "LOGIN",
    "LOGOUT",
    "EXPORT",
  ];
  const entities = [
    "all",
    "employee",
    "attendance",
    "applicant",
    "user",
    "role",
    "payroll",
  ];

  useEffect(() => {
    const fetchUserProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*, regions(*)")
          .eq("id", user.id)
          .single();
        setUserProfile(profile);
      }
    };
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchAuditLogs();
    }
  }, [userProfile, filterAction, filterEntity]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filterAction !== "all") {
        query = query.eq("action", filterAction);
      }
      if (filterEntity !== "all") {
        query = query.eq("entity_type", filterEntity);
      }

      if (!userProfile?.is_super_admin && userProfile?.region_id) {
        query = query.eq("region_id", userProfile.region_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "green";
      case "UPDATE":
        return "blue";
      case "DELETE":
        return "red";
      case "LOGIN":
        return "emerald";
      case "LOGOUT":
        return "gray";
      case "EXPORT":
        return "purple";
      default:
        return "gray";
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(search.toLowerCase()),
  );

  const exportLogs = () => {
    const csv = [
      ["Date", "User", "Action", "Entity Type", "Entity ID", "Changes"],
      ...filteredLogs.map((log) => [
        new Date(log.created_at).toLocaleString(),
        log.user_email,
        log.action,
        log.entity_type,
        log.entity_id,
        JSON.stringify(log.new_data || log.old_data || {}),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isSuperAdmin = userProfile?.is_super_admin;

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <Activity size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Access Denied
        </h2>
        <p className="text-slate-500">
          Only Super Administrators can view audit logs.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Audit Logs"
        subtitle="Track all user actions and system changes"
        actions={
          <Button variant="secondary" onClick={exportLogs}>
            <Download size={16} className="mr-1" /> Export Logs
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Actions</p>
              <p className="text-xl font-bold text-slate-800">{logs.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <User size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Active Users</p>
              <p className="text-xl font-bold text-slate-800">
                {new Set(logs.map((l) => l.user_email)).size}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Today's Activity</p>
              <p className="text-xl font-bold text-slate-800">
                {
                  logs.filter(
                    (l) =>
                      new Date(l.created_at).toDateString() ===
                      new Date().toDateString(),
                  ).length
                }
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFF1CC] text-[#D4A017] flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">This Month</p>
              <p className="text-xl font-bold text-slate-800">
                {
                  logs.filter(
                    (l) =>
                      new Date(l.created_at).getMonth() ===
                      new Date().getMonth(),
                  ).length
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user, action, entity..."
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]"
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
          >
            {actions.map((a) => (
              <option key={a} value={a}>
                {a === "all" ? "All Actions" : a}
              </option>
            ))}
          </select>
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
          >
            {entities.map((e) => (
              <option key={e} value={e}>
                {e === "all" ? "All Entities" : e.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Entity</th>
                <th className="px-4 py-3 text-left">Details</th>
                <th className="px-4 py-3 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.slice(0, 100).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs">
                      {new Date(log.created_at).toLocaleDateString()}
                      <br />
                      <span className="text-slate-400 text-[10px]">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-800">
                      {log.user_email?.split("@")[0]}
                    </div>
                    <div className="text-xs text-slate-400 capitalize">
                      {log.user_role || "user"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={getActionBadgeColor(log.action)}>
                      {log.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {log.entity_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {log.new_data && Object.keys(log.new_data).length > 0 && (
                      <div className="text-xs text-slate-600 truncate max-w-[200px]">
                        {Object.keys(log.new_data).slice(0, 2).join(", ")}
                        {Object.keys(log.new_data).length > 2 &&
                          ` +${Object.keys(log.new_data).length - 2}`}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLogs.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No audit logs found
          </div>
        )}
      </div>

      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Details"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Timestamp</p>
                <p className="font-medium">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">User</p>
                <p className="font-medium">{selectedLog.user_email}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Action</p>
                <Badge color={getActionBadgeColor(selectedLog.action)}>
                  {selectedLog.action}
                </Badge>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Entity</p>
                <p className="font-mono text-xs">
                  {selectedLog.entity_type} - {selectedLog.entity_id}
                </p>
              </div>
            </div>
            {selectedLog.old_data &&
              Object.keys(selectedLog.old_data).length > 0 && (
                <div>
                  <p className="text-slate-500 text-xs mb-2">Previous Data</p>
                  <pre className="bg-slate-50 p-3 rounded-lg text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.old_data, null, 2)}
                  </pre>
                </div>
              )}
            {selectedLog.new_data &&
              Object.keys(selectedLog.new_data).length > 0 && (
                <div>
                  <p className="text-slate-500 text-xs mb-2">New Data</p>
                  <pre className="bg-slate-50 p-3 rounded-lg text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.new_data, null, 2)}
                  </pre>
                </div>
              )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AuditLogsPage;