import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

const ManagerApprovalResult = () => {
  const [searchParams] = useSearchParams();
  
  const status = searchParams.get("status") || "error";
  const title = searchParams.get("title") || "שגיאה";
  const message = searchParams.get("message") || "אירעה שגיאה";

  const getStatusConfig = () => {
    switch (status) {
      case "success":
        return {
          icon: CheckCircle,
          bgColor: "bg-green-500",
          iconColor: "text-white",
        };
      case "rejected":
        return {
          icon: XCircle,
          bgColor: "bg-red-500",
          iconColor: "text-white",
        };
      case "info":
      case "already_handled":
        return {
          icon: CheckCircle,
          bgColor: "bg-blue-500",
          iconColor: "text-white",
        };
      default:
        return {
          icon: XCircle,
          bgColor: "bg-red-500",
          iconColor: "text-white",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div 
      dir="rtl" 
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
    >
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden text-center">
        {/* Header */}
        <div 
          className="py-8 px-5 text-white"
          style={{ background: "linear-gradient(135deg, #1a2b5f 0%, #2d4a8c 100%)" }}
        >
          <h2 className="text-2xl font-bold mb-2">ספק בקליק</h2>
          <p className="text-sm opacity-80">מערכת הקמת ספקים</p>
        </div>

        {/* Icon */}
        <div className="-mt-9 mb-5">
          <div 
            className={`w-[70px] h-[70px] rounded-full ${config.bgColor} inline-flex items-center justify-center shadow-lg border-4 border-white`}
          >
            <Icon className={`w-8 h-8 ${config.iconColor}`} />
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-10">
          <h1 className="text-2xl font-semibold mb-4" style={{ color: "#1a2b5f" }}>
            {decodeURIComponent(title)}
          </h1>
          <p className="text-gray-600 text-base leading-relaxed">
            {decodeURIComponent(message)}
          </p>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 py-4 text-sm text-gray-500 border-t border-gray-100">
          ניתן לסגור חלון זה
        </div>
      </div>
    </div>
  );
};

export default ManagerApprovalResult;
