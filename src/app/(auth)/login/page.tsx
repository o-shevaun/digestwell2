"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function Login() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [err,setErr]=useState("");
  async function submit(e:any){ e.preventDefault();
    const res = await signIn("credentials",{ redirect:false, email, password });
    if (res?.error) setErr("Invalid credentials");
    else window.location.href="/";
  }
  return (
    <div className="max-w-md mx-auto mt-8 border p-6 rounded-2xl">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <form onSubmit={submit} className="space-y-3">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2"/>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" className="w-full border rounded px-3 py-2"/>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button className="w-full bg-primary text-white rounded py-2">Sign in</button>
      </form>
      <div className="text-sm mt-3">No account? <Link href="/register" className="text-primary">Register</Link></div>
    </div>
  );
}
