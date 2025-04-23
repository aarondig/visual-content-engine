// Moved new stepper/gallery UI here from app/app.tsx to make it the default homepage
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthForm from "../components/AuthForm";
import ClientForm from "../components/ClientForm";
import PostForm from "../components/PostForm";
import { getClients, addClient, deleteClient } from "../lib/clientService";
import { getPosts, addPost, deletePost } from "../lib/postService";
import { supabase } from "../lib/supabaseClient";

const STEPS = [
  { key: "home", label: "Home" },
  { key: "brand", label: "Brand Guide" },
  { key: "posts", label: "Posts" }
];

const DEV_MODE = true; // Set to false for production
const MOCK_USER = { id: "dev-user-123", email: "dev@local.test" };

function StepNav({ step, setStep, disabledSteps }: { step: string; setStep: (key: string) => void; disabledSteps: string[] }) {
  return (
    <nav className="flex gap-3 justify-center items-center py-4 bg-white border-b mb-6">
      {STEPS.map((s, idx) => (
        <button
          key={s.key}
          className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
            step === s.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-blue-100"
          } ${disabledSteps.includes(s.key) ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => !disabledSteps.includes(s.key) && setStep(s.key)}
          disabled={disabledSteps.includes(s.key)}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<string>(searchParams.get("step") || "home");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientLoading, setClientLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remember last state in localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const lastStep = localStorage.getItem("vce_last_step");
      const lastClient = localStorage.getItem("vce_last_client");
      if (lastStep) setStep(lastStep);
      if (lastClient) setSelectedClient(JSON.parse(lastClient));
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("vce_last_step", step);
      if (selectedClient) localStorage.setItem("vce_last_client", JSON.stringify(selectedClient));
    }
    // Sync to URL
    const params = new URLSearchParams(window.location.search);
    params.set("step", step);
    if (selectedClient?.id) params.set("client", selectedClient.id);
    else params.delete("client");
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", url);
  }, [step, selectedClient]);

  // Fetch clients
  useEffect(() => {
    if (user) {
      setClientLoading(true);
      getClients(user.id).then(({ data, error }) => {
        if (error) setError(error.message);
        else setClients(data || []);
        setClientLoading(false);
      });
    } else {
      setClients([]);
    }
  }, [user]);

  // Auth logic
  useEffect(() => {
    if (DEV_MODE) {
      setUser(MOCK_USER);
      setLoading(false);
      return;
    }
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Keyboard navigation (arrow keys)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const idx = STEPS.findIndex(s => s.key === step);
      if (e.key === "ArrowRight" && idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
      if (e.key === "ArrowLeft" && idx > 0) setStep(STEPS[idx - 1].key);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [step]);

  // Step prerequisites (only enforced in production)
  const disabledSteps = (() => {
    if (DEV_MODE) return [];
    const arr: string[] = [];
    if (!selectedClient) arr.push("brand", "posts");
    // Add more step requirements as needed
    return arr;
  })();

  // Gallery feed state
  const [galleryPosts, setGalleryPosts] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);

  // Fetch all posts for gallery
  useEffect(() => {
    if (step === "home" && user) {
      setGalleryLoading(true);
      // If a client is selected, filter by client_id; otherwise, get all
      let fetch;
      if (selectedClient) {
        fetch = getPosts(selectedClient.id);
      } else {
        // Fetch all posts for all clients (for this user)
        fetch = supabase.from("posts").select("*", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false });
      }
      Promise.resolve(fetch).then(({ data, error }) => {
        if (error) setError(error.message);
        else setGalleryPosts(data || []);
        setGalleryLoading(false);
      });
    }
  }, [step, user, selectedClient]);

  // Render steps
  function renderStep() {
    if (step === "home") {
      return (
        <div>
          <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="client-select" className="text-sm font-medium">Client:</label>
              <select
                id="client-select"
                className="border rounded px-2 py-1 text-sm"
                value={selectedClient?.id || ""}
                onChange={e => {
                  const client = clients.find(c => c.id === e.target.value);
                  setSelectedClient(client || null);
                }}
              >
                <option value="">All Clients</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
              <button
                className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium hover:bg-green-200"
                onClick={() => setShowAddClient(true)}
                title="Add new client"
              >
                + Add Client
              </button>
            </div>
            <button
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${selectedClient ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
              disabled={!selectedClient}
              onClick={() => setStep("posts")}
              title={selectedClient ? "Create a new post" : "Select a client to create a post"}
            >
              New Post
            </button>
          </div>
          {showAddClient && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white rounded shadow-lg p-6 w-full max-w-sm relative">
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                  onClick={() => setShowAddClient(false)}
                  title="Close"
                >
                  ×
                </button>
                <h3 className="text-lg font-bold mb-2">Add Client</h3>
                <ClientForm
                  onAdd={async (
                    name: string,
                    company_name: string,
                    job_title: string,
                    linkedin: string,
                    website: string,
                    image: string,
                    brand_guide: Record<string, any>
                  ) => {
                    setClientLoading(true);
                    setError(null);
                    const { data, error } = await addClient(
                      user.id,
                      name,
                      company_name,
                      job_title,
                      linkedin,
                      website,
                      image,
                      brand_guide
                    );
                    if (error) setError(error.message);
                    else setClients([...(clients || []), ...(data || [])]);
                    setClientLoading(false);
                    setShowAddClient(false);
                  }}
                  loading={clientLoading}
                />
                {error && <div className="text-red-600 mb-2">{error}</div>}
              </div>
            </div>
          )}
          <div className="mt-6">
            {galleryLoading ? (
              <div className="text-gray-500">Loading gallery...</div>
            ) : galleryPosts.length === 0 ? (
              <div className="text-gray-400">No posts/images yet. Start by adding a client and creating a post!</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {galleryPosts.map(post => (
                  <div key={post.id} className="border rounded-lg bg-white shadow-sm p-2 flex flex-col items-center">
                    {post.image_url ? (
                      <img src={post.image_url} alt="Generated" className="w-full max-w-xs max-h-40 rounded border shadow-md object-contain mb-2" />
                    ) : (
                      <div className="w-full h-24 bg-gray-100 rounded flex items-center justify-center text-gray-400">No image</div>
                    )}
                    <div className="text-xs text-gray-700 font-mono mb-1 line-clamp-2 text-center">{post.content}</div>
                    <div className="text-xs text-gray-400">{new Date(post.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    if (step === "brand") {
      if (!selectedClient) return <div className="text-gray-500">Select a client first.</div>;
      // ...Brand guide form goes here (reuse ClientForm or make a dedicated component)
      return <div>Brand Guide for <span className="font-bold">{selectedClient.name}</span> (Coming soon...)</div>;
    }
    if (step === "posts") {
      if (!selectedClient) return <div className="text-gray-500">Select a client first.</div>;
      // ...Post management UI goes here
      return <div>Posts for <span className="font-bold">{selectedClient.name}</span> (Coming soon...)</div>;
    }
    return null;
  }

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (!user && !DEV_MODE) return <AuthForm onAuth={() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
  }} />;

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow text-center">
      <StepNav step={step} setStep={setStep} disabledSteps={disabledSteps} />
      {renderStep()}
    </div>
  );
}
