import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar, Shield, Award, Edit3, Save, Check } from 'lucide-react';

export default function ProfileView() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Librarian Gowthami',
    role: 'Chief Administrator / Head Librarian',
    email: 'gowthami@srigowthami.edu.in',
    phone: '+91 98765 43210',
    campus: 'Sri Gowthami Main Campus, Rajahmundry',
    joined: 'June 15, 2024'
  });
  const [form, setForm] = useState({ ...profile });
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setProfile({ ...form });
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white m-0 font-heading">Librarian Profile</h2>
        <p className="text-slate-400 text-xs mt-1">Manage your administrative details and security permissions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Card Profile Overview */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#1e293b] border border-[#E5E7EB] dark:border-slate-800 rounded-[20px] p-6 shadow-sm flex flex-col items-center text-center">
            {/* Avatar Initials */}
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#2563eb] to-[#38bdf8] text-white flex items-center justify-center font-bold text-3xl shadow-md mb-4">
              LG
            </div>
            
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">{profile.name}</h3>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-4">{profile.role}</p>
            
            <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-100 dark:border-blue-900/30">
              System Admin
            </span>

            <div className="w-full border-t border-slate-100 dark:border-slate-800 my-5 pt-5 space-y-3.5 text-xs">
              <div className="flex items-center gap-2.5 text-slate-650 dark:text-slate-350">
                <MapPin className="w-4 h-4 text-[#2563eb]" />
                <span className="truncate">{profile.campus}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-650 dark:text-slate-350">
                <Calendar className="w-4 h-4 text-[#2563eb]" />
                <span>Joined {profile.joined}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-white dark:bg-[#1e293b] border border-[#E5E7EB] dark:border-slate-800 rounded-[20px] p-5 shadow-sm text-left">
            <h4 className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-4">Activity Summary</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-2.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Books Cataloged</span>
                <strong className="text-sm text-slate-800 dark:text-white">245</strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-2.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Issues Processed</span>
                <strong className="text-sm text-slate-800 dark:text-white">1,840</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Fines Approved</span>
                <strong className="text-sm text-slate-800 dark:text-white">₹12,450</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Edit Profile Form & Credentials */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#1e293b] border border-[#E5E7EB] dark:border-slate-800 rounded-[20px] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-white m-0 font-heading">
                Account Information
              </h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-4 h-9 border border-[#E5E7EB] hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              )}
            </div>

            {saved && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                Profile changes successfully updated!
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      disabled={!isEditing}
                      className="pl-11 pr-4 h-11 bg-[#F8FAFC] dark:bg-slate-900/60 disabled:opacity-75 disabled:cursor-not-allowed focus:border-[#2563eb]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-450 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                    System Role
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.role}
                      disabled
                      className="pl-11 pr-4 h-11 bg-[#F8FAFC] dark:bg-slate-900/60 opacity-60 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      disabled={!isEditing}
                      className="pl-11 pr-4 h-11 bg-[#F8FAFC] dark:bg-slate-900/60 disabled:opacity-75 disabled:cursor-not-allowed focus:border-[#2563eb]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-450 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      disabled={!isEditing}
                      className="pl-11 pr-4 h-11 bg-[#F8FAFC] dark:bg-slate-900/60 disabled:opacity-75 disabled:cursor-not-allowed focus:border-[#2563eb]"
                      required
                    />
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-50 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setForm({ ...profile }); setIsEditing(false); }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl shadow-md shadow-[#2563eb]/20 cursor-pointer transition active:scale-95"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Details
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* System Clearances */}
          <div className="bg-white dark:bg-[#1e293b] border border-[#E5E7EB] dark:border-slate-800 rounded-[20px] p-6 shadow-sm text-left">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4 font-heading flex items-center gap-2">
              <Award className="w-5 h-5 text-[#2563eb]" />
              Security Permissions & Clearances
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-white">Catalog Management</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold block mt-1 py-0.5 px-2 rounded w-fit">FULL WRITE</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-white">Member Registration</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold block mt-1 py-0.5 px-2 rounded w-fit">FULL WRITE</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-white">Fine Waiver Authority</span>
                <span className="text-[10px] bg-amber-50 text-amber-600 font-bold block mt-1 py-0.5 px-2 rounded w-fit">AUTHORIZED (₹500 MAX)</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-white">System Settings</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold block mt-1 py-0.5 px-2 rounded w-fit">FULL ACCESS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
