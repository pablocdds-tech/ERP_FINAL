import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function ErpLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <div className="hidden md:block fixed inset-y-0 left-0">
          <Sidebar />
        </div>
        <div className="flex-1 md:pl-64 min-h-screen flex flex-col">
          <Topbar />
          <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}