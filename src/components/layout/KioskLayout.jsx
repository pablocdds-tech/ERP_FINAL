import { Outlet } from "react-router-dom";

export default function KioskLayout() {
  return (
    <div
      className="fixed inset-0 bg-slate-950 text-white overflow-hidden flex flex-col"
      style={{ height: "100dvh", width: "100dvw" }}
    >
      <Outlet />
    </div>
  );
}