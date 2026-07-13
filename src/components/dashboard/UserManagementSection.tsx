"use client";

import { useState } from "react";
import {
  FieldInput,
  FieldSelect,
  MiniCards,
  formatNullableDate,
  userRoleText,
  userStatusText,
} from "@/components/dashboard/shared";
import type {
  LoadingState,
  UserAccount,
  UserFormState,
} from "@/components/dashboard/types";

export function UserManagementPanel({
  users,
  currentUser,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
}: {
  users: UserAccount[];
  currentUser: UserAccount | null;
  loading: LoadingState;
  onCreate: (payload: UserFormState) => Promise<void>;
  onUpdate: (id: string, payload: Partial<UserFormState>) => Promise<void>;
  onDelete: (user: UserAccount) => Promise<void>;
  onRefresh: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<UserFormState>({
    username: "",
    displayName: "",
    password: "",
    role: "operator",
    status: "enabled",
  });
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const enabledCount = users.filter((item) => item.status === "enabled").length;
  const adminCount = users.filter((item) => item.role === "admin" && item.status === "enabled").length;

  async function handleCreate() {
    await onCreate(form);
    setForm({
      username: "",
      displayName: "",
      password: "",
      role: "operator",
      status: "enabled",
    });
  }

  async function handleResetPassword(user: UserAccount) {
    const password = passwordDrafts[user.id]?.trim() ?? "";
    if (!password) return;
    await onUpdate(user.id, { password });
    setPasswordDrafts((current) => ({ ...current, [user.id]: "" }));
  }

  return (
    <div className="user-management">
      <div className="role-stat-grid">
        <div className="stat-tile">
          <span>用户总数</span>
          <strong>{users.length}</strong>
          <p>后台登录账号统一在这里维护</p>
        </div>
        <div className="stat-tile">
          <span>启用账号</span>
          <strong>{enabledCount}</strong>
          <p>停用账号无法登录后台</p>
        </div>
        <div className="stat-tile">
          <span>管理员</span>
          <strong>{adminCount}</strong>
          <p>至少保留一个启用管理员</p>
        </div>
        <div className="stat-tile">
          <span>当前登录</span>
          <strong>{currentUser?.displayName || currentUser?.username || "-"}</strong>
          <p>{currentUser ? userRoleText(currentUser.role) : "账号信息加载中"}</p>
        </div>
      </div>

      <div className="split">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">新增用户</h3>
              <div className="hint">创建后用户可立即使用用户名和密码登录后台。</div>
            </div>
          </div>
          <div className="form-grid">
            <FieldInput label="用户名" value={form.username} onChange={(value) => setForm((current) => ({ ...current, username: value }))} />
            <FieldInput label="显示名称" value={form.displayName} onChange={(value) => setForm((current) => ({ ...current, displayName: value }))} />
            <FieldInput label="初始密码" type="password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} />
            <FieldSelect
              label="角色"
              value={form.role}
              onChange={(value) => setForm((current) => ({ ...current, role: value as UserFormState["role"] }))}
              options={[["operator", "运营人员"], ["admin", "管理员"]]}
            />
            <FieldSelect
              label="状态"
              value={form.status}
              onChange={(value) => setForm((current) => ({ ...current, status: value as UserFormState["status"] }))}
              options={[["enabled", "启用"], ["disabled", "停用"]]}
            />
          </div>
          <div className="toolbar" style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary"
              disabled={Boolean(loading.saveUser) || !form.username.trim() || form.password.trim().length < 6}
              onClick={() => void handleCreate()}
            >
              {loading.saveUser ? "创建中..." : "创建用户"}
            </button>
            <button className="btn btn-light" onClick={() => void onRefresh()}>刷新列表</button>
          </div>
          <div className="settings-status" style={{ marginTop: 16 }}>
            密码使用 scrypt 哈希后存入本地 SQLite，登录态通过 HTTP-only JWT Cookie 保存。
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">权限说明</h3>
              <div className="hint">当前版本提供后台登录控制，管理员账号用于保底维护。</div>
            </div>
          </div>
          <MiniCards items={[
            "管理员和运营人员都可以登录后台。",
            "停用账号无法再次登录，已有登录态会在 JWT 到期后失效。",
            "系统会阻止删除或停用最后一个启用管理员。",
          ]} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">用户列表</h3>
            <div className="hint">可停用账号、重置密码或删除非当前登录账号。</div>
          </div>
          <button className="btn btn-light" onClick={() => void onRefresh()} disabled={Boolean(loading.users)}>
            {loading.users ? "刷新中..." : "刷新"}
          </button>
        </div>
        <div className="kb-table-scroll">
          <table className="qa-table">
            <thead>
              <tr>
                <th>账号</th>
                <th>角色</th>
                <th>状态</th>
                <th>最近登录</th>
                <th>重置密码</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? users.map((user) => {
                const busy = Boolean(loading[`user-${user.id}`]);
                const isCurrent = currentUser?.id === user.id;
                return (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.displayName || user.username}</strong>
                      <div className="kb-muted">{user.username}</div>
                    </td>
                    <td>{userRoleText(user.role)}</td>
                    <td>
                      <span className={`status-pill ${user.status === "enabled" ? "status-ready" : "status-wait"}`}>
                        {userStatusText(user.status)}
                      </span>
                    </td>
                    <td>{formatNullableDate(user.lastLoginAt)}</td>
                    <td>
                      <div className="list-input">
                        <input
                          className="input"
                          type="password"
                          value={passwordDrafts[user.id] ?? ""}
                          placeholder="输入新密码"
                          onChange={(event) => setPasswordDrafts((current) => ({ ...current, [user.id]: event.target.value }))}
                        />
                        <button
                          className="btn btn-light"
                          disabled={busy || (passwordDrafts[user.id]?.trim().length ?? 0) < 6}
                          onClick={() => void handleResetPassword(user)}
                        >
                          重置
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="toolbar">
                        <button
                          className="btn btn-light"
                          disabled={busy || isCurrent}
                          onClick={() => void onUpdate(user.id, { status: user.status === "enabled" ? "disabled" : "enabled" })}
                        >
                          {user.status === "enabled" ? "停用" : "启用"}
                        </button>
                        <button
                          className="btn btn-danger"
                          disabled={busy || isCurrent}
                          onClick={() => void onDelete(user)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="table-empty">当前暂无用户。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
