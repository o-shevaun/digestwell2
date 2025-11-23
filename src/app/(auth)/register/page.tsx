"use client";
import { useState } from "react";
import Link from "next/link";

export default function Register() {
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [msg,setMsg]=useState("");
  async function submit(e:any){ e.preventDefault();
    const r = await fetch("/api/users/register",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ name,email,password }) });
    const data = await r.json();
    if (!r.ok) setMsg(data.error||"Failed"); else setMsg("Registered. You can now login.");
  }
  return (
    <div className="max-w-md mx-auto mt-8 border p-6 rounded-2xl">
      <h1 className="text-2xl font-semibold mb-4">Create account</h1>
      <form onSubmit={submit} className="space-y-3">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full border rounded px-3 py-2"/>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2"/>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password (min 6)" className="w-full border rounded px-3 py-2"/>
        <button className="w-full bg-primary text-white rounded py-2">Register</button>
      </form>
      <div className="text-sm mt-3">Have an account? <Link href="/login" className="text-primary">Login</Link></div>
      {msg && <div className="text-sm mt-2">{msg}</div>}
    </div>
  );
}
