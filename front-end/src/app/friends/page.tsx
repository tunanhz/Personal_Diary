"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthProvider";

type User = {
  _id: string;
  username: string;
  fullName: string;
  avatar: string;
};

type FriendRequest = {
  _id: string;
  requester: User;
  recipient: User;
  status: string;
  createdAt: string;
};

export default function FriendsPage() {
  const { token, user } = useAuth();
  const router = useRouter();

  const [friends, setFriends] = useState<User[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [friendsRes, requestsRes] = await Promise.all([
        apiFetch("/friends", {}, token),
        apiFetch("/friends/requests", {}, token)
      ]);
      setFriends(friendsRes.data || []);
      setSentRequests(requestsRes.data?.sent || []);
      setReceivedRequests(requestsRes.data?.received || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [user, router, fetchData]);

  const handleAccept = async (requestId: string) => {
    try {
      await apiFetch(`/friends/accept/${requestId}`, { method: "POST" }, token);
      fetchData(); // reload
    } catch (err: any) {
      alert(err.message || "Failed to accept");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await apiFetch(`/friends/reject/${requestId}`, { method: "POST" }, token);
      fetchData(); // reload
    } catch (err: any) {
      alert(err.message || "Failed to reject");
    }
  };

  const handleRemoveFriend = async (userId: string) => {
    if (!confirm("Remove this friend?")) return;
    try {
      await apiFetch(`/friends/remove/${userId}`, { method: "DELETE" }, token);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to unfriend");
    }
  };

  if (!user || loading) {
    return (
      <div className="max-w-4xl mx-auto flex justify-center py-12">
        <div className="skeleton w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  const UserCard = ({ targetUser, actionButtons }: { targetUser: User, actionButtons: React.ReactNode }) => (
    <div className="card flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href={`/user/${targetUser._id}`}>
          {targetUser.avatar ? (
            <img src={targetUser.avatar} alt="avatar" className="w-12 h-12 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
              {(targetUser.fullName || targetUser.username).charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div>
          <Link href={`/user/${targetUser._id}`} className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors">
            {targetUser.fullName || targetUser.username}
          </Link>
          <div className="text-xs text-slate-500">@{targetUser.username}</div>
        </div>
      </div>
      <div>{actionButtons}</div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white text-xl shadow-md">
          👥
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Friends</h1>
      </div>

      <div className="flex gap-4 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab("friends")}
          className={`pb-3 text-sm font-semibold px-2 transition-colors border-b-2 ${
            activeTab === "friends" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          My Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`pb-3 text-sm font-semibold px-2 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "requests" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Requests
          {receivedRequests.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {receivedRequests.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "friends" && (
        <div className="space-y-3">
          {friends.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🔍</div>
              <h3>No friends yet</h3>
              <p>Explore the feed and connect with other users to build your network.</p>
              <Link href="/" className="btn-primary mt-4 inline-block">Explore Diaries</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.map(friend => (
                <UserCard
                  key={friend._id}
                  targetUser={friend}
                  actionButtons={
                    <button onClick={() => handleRemoveFriend(friend._id)} className="text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                      Unfriend
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "requests" && (
        <div className="space-y-8">
          {/* Received Requests */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Received Requests</h3>
            {receivedRequests.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100 italic">No incoming requests.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {receivedRequests.map(req => (
                  <UserCard
                    key={req._id}
                    targetUser={req.requester}
                    actionButtons={
                      <div className="flex gap-2">
                        <button onClick={() => handleAccept(req._id)} className="btn-primary text-xs py-1.5 bg-emerald-500 hover:bg-emerald-600 border-0">Accept</button>
                        <button onClick={() => handleReject(req._id)} className="btn-secondary text-xs py-1.5">Reject</button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sent Requests */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Sent Requests</h3>
            {sentRequests.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100 italic">No pending sent requests.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sentRequests.map(req => (
                  <UserCard
                    key={req._id}
                    targetUser={req.recipient}
                    actionButtons={
                      <button onClick={() => handleReject(req._id)} className="text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                        Cancel
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
