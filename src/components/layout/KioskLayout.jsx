import { Outlet } from "react-router-dom";

export default function KioskLayout() {
  return (
    <div className="fixed inset-0 bg-slate-950 text-white overflow-hidden flex flex-col">
      <Outlet />
    </div>
  );
}