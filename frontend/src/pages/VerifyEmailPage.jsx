import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/api";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setStatus("error"); setMessage("No token provided."); return; }
    api.get(`/auth/verify-email?token=${token}`)
      .then((r) => { setStatus("success"); setMessage(r.data.message); })
      .catch((e) => { setStatus("error"); setMessage(e.response?.data?.error?.message || "Verification failed."); });
  }, [params]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        {status === "verifying" && <><div className="text-4xl mb-4">⏳</div><p className="text-gray-600">Verifying your email…</p></>}
        {status === "success" && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Email Verified!</h1>
            <p className="text-gray-500 mb-6">{message}</p>
            <Link to="/login" className="btn-primary inline-block">Go to Login</Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-500 mb-6">{message}</p>
            <Link to="/login" className="btn-secondary inline-block">Back to Login</Link>
          </>
        )}
      </div>
    </div>
  );
}
