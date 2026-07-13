"use client";

import { useEffect, useState } from "react";
import {
  DeviceRecordTable,
  FieldSelect,
  formatDate,
  QaTable,
  Timeline,
} from "@/components/dashboard/shared";
import type {
  ActivationCodeRecord,
  DeviceBinding,
  DeviceData,
  DigitalHumanConfigVersion,
  DigitalHumanRecord,
  LoadingState,
  PendingActivationRequest,
  PublishRecord,
} from "@/components/dashboard/types";

export function PublishPanel({
  digitalHumans,
  selectedHumanId,
  selectedHuman,
  selectedConfigVersion,
  publishRecords,
  activationRecords,
  pendingActivationRequests,
  deviceData,
  loading,
  onSelectRole,
  onApprovePendingActivation,
  onDeleteActivatedDevice,
  onRefresh,
}: {
  digitalHumans: DigitalHumanRecord[];
  selectedHumanId: string;
  selectedHuman: DigitalHumanRecord | null;
  selectedConfigVersion: DigitalHumanConfigVersion | null;
  publishRecords: PublishRecord[];
  activationRecords: ActivationCodeRecord[];
  pendingActivationRequests: PendingActivationRequest[];
  deviceData: DeviceData | null;
  loading: LoadingState;
  onSelectRole: (roleId: string) => void;
  onApprovePendingActivation: (roleId: string, requestId: string) => Promise<void>;
  onDeleteActivatedDevice: (roleId: string, deviceCode: string) => Promise<void>;
  onRefresh: () => void;
}) {
  const [devices, setDevices] = useState<DeviceBinding[]>(deviceData?.devices ?? []);
  const [approvalRoleId, setApprovalRoleId] = useState("");

  useEffect(() => {
    setDevices(deviceData?.devices ?? []);
  }, [deviceData]);

  useEffect(() => {
    if (approvalRoleId && !digitalHumans.some((item) => item.id === approvalRoleId)) {
      setApprovalRoleId("");
    }
  }, [approvalRoleId, digitalHumans]);

  const roleOptions = digitalHumans.map((item) => [item.id, item.name] as [string, string]);
  const pendingItems = pendingActivationRequests.filter((item) => item.status === "pending");
  const approvalRole = digitalHumans.find((item) => item.id === approvalRoleId) ?? null;
  const publishStats = [
    { label: "当前角色", value: approvalRole?.name ?? "未指定", note: approvalRole?.assistantName || "审批前必须手动指定角色" },
    { label: "配置版本", value: approvalRoleId && selectedHumanId === approvalRoleId && selectedConfigVersion ? `V${selectedConfigVersion.versionNo}` : "未确认", note: "指定角色后再确认配置版本" },
    { label: "待激活数", value: String(pendingItems.length), note: "App 首次启动会自动上报设备码" },
    { label: "设备数量", value: String(devices.length), note: "激活成功后自动入库" },
  ];

  if (!selectedHuman && !selectedHumanId) {
    return <div className="panel"><div className="panel-header"><h3 className="panel-title">发布中心</h3></div><div className="settings-status warn" style={{ marginTop: 16 }}>请先创建至少一个角色，然后再处理自动上报的待激活设备。</div></div>;
  }

  return (
    <>
      <div className="role-stat-grid">
        {publishStats.map((item) => (
          <div className="stat-tile" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </div>
        ))}
      </div>
      <div className="split">
        <div className="panel">
          <div className="panel-header"><h3 className="panel-title">无感激活审批</h3></div>
          <div className="form-grid">
            <FieldSelect
              label="绑定角色"
              value={approvalRoleId}
              onChange={(roleId) => {
                setApprovalRoleId(roleId);
                if (roleId) {
                  onSelectRole(roleId);
                }
              }}
              options={roleOptions}
              placeholder="请先手动指定角色"
            />
          </div>
          <div className="toolbar" style={{ marginTop: 16 }}>
            <span className="hint">
              绑定角色：{approvalRole?.name ?? "未指定"} / 当前配置版本：{approvalRoleId && selectedHumanId === approvalRoleId && selectedConfigVersion ? `V${selectedConfigVersion.versionNo}` : "未确认"}
            </span>
            <button className="btn btn-light" onClick={onRefresh}>刷新</button>
          </div>
          <div className="settings-status" style={{ marginTop: 16 }}>
            App 首次启动会自动上报设备码，系统自动生成激活码并进入“待激活”列表。管理员必须先手动指定角色，再点击“同意激活”，App 端才会完成绑定和配置同步。
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><h3 className="panel-title">待激活设备</h3></div>
          {pendingItems.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>设备编码</th>
                  <th>设备信息</th>
                  <th>自动激活码</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.deviceCode}</td>
                    <td>
                      {item.deviceName || "未命名设备"}
                      <div className="hint" style={{ marginTop: 6 }}>
                        版本：{item.appVersion || "未上报"} / 请求时间：{formatDate(item.requestedAt)} / 已请求：{item.requestCount} 次
                      </div>
                    </td>
                    <td>{item.activationCodeMasked}</td>
                    <td>
                      <button
                        className="btn btn-primary"
                        disabled={!approvalRoleId || Boolean(loading.approvePendingActivation)}
                        onClick={() => void onApprovePendingActivation(approvalRoleId, item.id)}
                      >
                        {loading.approvePendingActivation ? "处理中..." : "同意激活"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">当前没有待激活设备。App 端首次启动并上报设备码后，会自动出现在这里。</div>
          )}
        </div>
      </div>
      <div className="split">
        <div className="panel">
          <div className="panel-header"><h3 className="panel-title">激活记录</h3></div>
          <QaTable rows={activationRecords.map((item) => [
            item.deviceCode,
            `${item.activationCode} / ${item.deviceName || "未命名设备"}${item.remark ? ` / ${item.remark}` : ""}`,
            item.status === "activated" ? "已激活" : "已生成",
          ])} />
          <Timeline items={[
            `当前角色：${approvalRole?.name ?? "未指定"}`,
            `待激活设备：${pendingItems.length} 台`,
            `累计激活记录：${activationRecords.length} 条`,
            `设备首次启动无需手填激活码，但审批前必须先手动指定角色`,
          ]} />
        </div>
        <div className="panel">
          <div className="panel-header"><h3 className="panel-title">发布流水</h3></div>
          <QaTable rows={publishRecords.map((item) => [
            item.publishVersion,
            `${item.summary}${item.remark ? ` / ${item.remark}` : ""}`,
            item.status === "completed" ? "已完成" : "处理中",
          ])} />
        </div>
      </div>
      <div className="split">
        <div className="panel">
          <div className="panel-header"><h3 className="panel-title">设备同步记录</h3></div>
          <DeviceRecordTable
            items={devices}
            deleting={Boolean(loading.deleteActivatedDevice)}
            onDelete={(deviceCode) => {
              if (!selectedHumanId) {
                return;
              }
              if (!window.confirm(`删除设备 ${deviceCode} 后，这台设备将必须重新激活，确认继续吗？`)) {
                return;
              }
              void onDeleteActivatedDevice(selectedHumanId, deviceCode);
            }}
          />
          <Timeline items={[
            `当前绑定角色：${approvalRole?.name ?? "未指定"}`,
            `设备数量：${devices.length} 台`,
            `激活码发放数：${activationRecords.length} 条`,
            `历史发布记录：${publishRecords.length} 条`,
          ]} />
        </div>
        <div className="panel">
          <div className="panel-header"><h3 className="panel-title">审批说明</h3></div>
          <Timeline items={[
            "1. App 首次启动后会自动向管理端发送设备码和设备信息",
            "2. 管理端会自动生成激活码并把设备加入待激活列表",
            "3. 管理员选择目标角色后点击“同意激活”",
            "4. App 端会自动轮询审批结果并同步角色配置，无需手动输入激活码",
          ]} />
        </div>
      </div>
    </>
  );
}
