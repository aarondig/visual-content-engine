"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthForm from "../components/AuthForm";
import ClientForm from "../components/ClientForm";
import PostForm from "../components/PostForm";
import { AnimatePresence, motion } from "framer-motion";
import { getClients, addClient, deleteClient } from "../lib/clientService";
import { getPosts, addPost, deletePost } from "../lib/postService";
import { supabase } from "../lib/supabaseClient";

const STEPS = [
  { key: "home", label: "Home" },
  { key: "choose_client", label: "Choose Client" },
  { key: "add_post_content", label: "Add Post Content" },
  { key: "suggested_ideas", label: "Suggested Ideas" },
  { key: "visuals_generate", label: "Visuals Generate" }
];
type Step = "home" | "choose_client" | "add_post_content" | "suggested_ideas" | "visuals_generate";


const DEV_MODE = true; // Set to false for production
const MOCK_USER = { id: "dev-user-123", email: "dev@local.test" };

import { Dispatch, SetStateAction } from "react";
function StepNav({ step, setStep, disabledSteps }: { step: Step; setStep: Dispatch<SetStateAction<Step>>; disabledSteps: Step[] }) {
  return (
    <nav className="flex gap-3 justify-center items-center py-4 bg-white border-b mb-6">
      {STEPS.map((s, idx) => (
        <button
          key={s.key}
          className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
            step === s.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-blue-100"
          } ${disabledSteps.includes(s.key as Step) ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => !disabledSteps.includes(s.key as Step) && setStep(s.key as Step)}
          disabled={disabledSteps.includes(s.key as Step)}
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
  const [step, setStep] = useState<Step>(() => {
    if (DEV_MODE && typeof window !== "undefined") {
      // Prefer last step from localStorage for dev navigation, else default to home
      const lastStep = localStorage.getItem("vce_last_step");
      const validSteps: Step[] = ["home", "choose_client", "add_post_content", "suggested_ideas", "visuals_generate"];
      if (lastStep && validSteps.includes(lastStep as Step)) return lastStep as Step;
      return "home";
    }
    // In prod, use URL/searchParams
    return searchParams.get("step") as Step || "home";
  });
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [postContent, setPostContent] = useState<string>("");
  const [visualRefs, setVisualRefs] = useState<(File | string)[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generatedVisuals, setGeneratedVisuals] = useState<string[]>([]);
  const [selectedVisual, setSelectedVisual] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientLoading, setClientLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // New state for editing clients
  const [editClient, setEditClient] = useState<any>(null);
  const [showEditClient, setShowEditClient] = useState(false);

  // Remember last state in localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const lastClient = localStorage.getItem("vce_last_client");
      if (lastClient) setSelectedClient(JSON.parse(lastClient));
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("vce_last_step", step);
      if (selectedClient) localStorage.setItem("vce_last_client", JSON.stringify(selectedClient));
    }
    if (!DEV_MODE) {
      // Only sync to URL in production
      const params = new URLSearchParams(window.location.search);
      params.set("step", step);
      if (selectedClient?.id) params.set("client", selectedClient.id);
      else params.delete("client");
      const url = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", url);
    }
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
      if (e.key === "ArrowRight" && idx < STEPS.length - 1) setStep(STEPS[idx + 1].key as Step);
      if (e.key === "ArrowLeft" && idx > 0) setStep(STEPS[idx - 1].key as Step);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [step]);

  // Step prerequisites (only enforced in production)
  const disabledSteps: Step[] = (() => {
    if (DEV_MODE) return [];
    const arr: Step[] = [];
    // Example: disable steps if no client
    if (!selectedClient) arr.push("choose_client", "add_post_content", "suggested_ideas", "visuals_generate");
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
    // --- HOME STEP ---
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
                <AnimatePresence initial={false}>
                  {clients.map(client => (
                    <motion.option
                      key={client.id}
                      value={client.id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {client.name}
                    </motion.option>
                  ))}
                </AnimatePresence>
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
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${clients.length > 0 ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
              disabled={clients.length === 0}
              onClick={() => setStep("choose_client" as Step)}
              title={clients.length > 0 ? "Create a new post" : "Add a client first"}
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
                  loading={clientLoading}
                  onAdd={async (
                    name,
                    company_name,
                    job_title,
                    linkedin,
                    website,
                    image,
                    brand_guide
                  ) => {
                    setClientLoading(true);
                    setError(null);
                    // Pass empty strings/arrays for fields not present in the form
                    const { data, error } = await addClient(
                      user.id,
                      name,
                      company_name,
                      job_title,
                      "", // linkedin
                      "", // website
                      "", // image
                      { colors: [], logo: "" } // brand_guide
                    );
                    setClientLoading(false);
                    if (error) {
                      setError(error.message);
                    } else {
                      setShowAddClient(false);
                      // Refresh clients and auto-select the new client
                      const { data: updatedClients, error: getClientsError } = await getClients(user.id);
                      if (getClientsError) {
                        setError(getClientsError.message);
                        return;
                      }
                      setClients(updatedClients || []);
                      const newClient = (updatedClients || []).find((c: any) => c.name === name && c.company_name === company_name);
                      if (newClient) setSelectedClient(newClient);
                    }
                  }}
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
    // --- CHOOSE CLIENT STEP ---
    if (step === "choose_client") {
      return (
        <div className="max-w-md mx-auto mt-8">
          <h2 className="text-xl font-bold mb-4">Choose a Client</h2>
          {clients.length === 0 ? (
            <div className="text-gray-500">No clients found. Add a client first.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {clients.map(client => (
                <li key={client.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {/* Placeholder for client image */}
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                      {client.image ? (
                        <img src={client.image} alt={client.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : client.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold">{client.name}</div>
                      <div className="text-xs text-gray-500">{client.company_name} — {client.job_title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-blue-500 hover:text-blue-700 text-sm px-2"
                      title="Edit client"
                      onClick={e => {
                        e.stopPropagation();
                        setEditClient(client);
                        setShowEditClient(true);
                      }}
                    >
                      ✎
                    </button>
                    <button
                      className="ml-2 px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700"
                      onClick={() => {
                        setSelectedClient(client);
                        setStep("add_post_content" as Step);
                      }}
                    >
                      Select
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button className="mt-6 text-gray-500 hover:underline" onClick={() => setStep("home" as Step)}>← Back to Home</button>
        </div>
      );
    }
    // --- ADD POST CONTENT STEP ---
    if (step === "add_post_content") {
      return (
        <div className="max-w-lg mx-auto mt-8">
          <h2 className="text-xl font-bold mb-4">Add Post Content</h2>
          <textarea
            className="w-full border rounded p-2 mb-4"
            rows={8}
            placeholder="Paste or write your LinkedIn post copy here (100-300 words)"
            value={postContent}
            onChange={e => setPostContent(e.target.value)}
          />
          {/* TODO: Visual reference upload UI */}
          <div className="flex gap-4 mt-4">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={() => setStep("suggested_ideas" as Step)}
            >
              Next: Get Suggestions
            </button>
            <button
              className="text-gray-500 hover:underline"
              onClick={() => setStep("choose_client" as Step)}
            >
              ← Back to Client
            </button>
          </div>
        </div>
      );
    }
    // --- VISUALS GENERATE STEP ---
    if (step === "visuals_generate") {
      return (
        <div className="max-w-3xl mx-auto mt-8">
          <h2 className="text-xl font-bold mb-4">Generated Visuals</h2>
          {/* TODO: Visuals grid, selection, and toolbar */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Placeholder visuals */}
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 rounded-lg h-40 flex items-center justify-center cursor-pointer"
                onClick={() => setSelectedVisual(`visual-${i}`)}
              >
                <span className="text-2xl text-gray-500">🖼️</span>
              </div>
            ))}
          </div>
          {selectedVisual && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-xl w-full relative">
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                  onClick={() => setSelectedVisual(null)}
                  title="Close"
                >
                  ×
                </button>
                <div className="w-full h-72 bg-gray-100 rounded flex items-center justify-center mb-4">
                  <span className="text-4xl text-gray-400">🖼️</span>
                </div>
                <div className="text-center text-gray-700 mb-2">{postContent}</div>
                {/* TODO: Navigation arrows, toolbar, rerun, save, export, recreate */}
                <div className="flex justify-center gap-4 mt-4">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save</button>
                  <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">Export</button>
                  <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300" onClick={() => {
                    setStep("add_post_content" as Step);
                    setVisualRefs([selectedVisual!]); // TODO: Pass actual reference
                    setSelectedVisual(null);
                  }}>Recreate Similar</button>
                </div>
              </div>
            </div>
          )}
          <button className="mt-6 text-gray-500 hover:underline" onClick={() => setStep("suggested_ideas" as Step)}>← Back</button>
        </div>
      );
    }
    // --- DEFAULT ---
    return null;
  }

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (!user && !DEV_MODE) return <AuthForm onAuth={() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
  }} />;

  return (
    <>

      {DEV_MODE && (
        <nav className="w-full flex justify-center gap-4 py-3 bg-gray-100 border-b sticky top-0 z-50">
          <button onClick={() => setStep("home")}
            className={`px-3 py-1 rounded ${step === "home" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-600"}`}>Home</button>
          <button onClick={() => setStep("choose_client")}
            className={`px-3 py-1 rounded ${step === "choose_client" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-600"}`}>Choose Client</button>
          <button onClick={() => setStep("add_post_content")}
            className={`px-3 py-1 rounded ${step === "add_post_content" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-600"}`}>Add Post Content</button>
          <button onClick={() => setStep("suggested_ideas")}
            className={`px-3 py-1 rounded ${step === "suggested_ideas" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-600"}`}>Suggested Ideas</button>
          <button onClick={() => setStep("visuals_generate")}
            className={`px-3 py-1 rounded ${step === "visuals_generate" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-600"}`}>Visuals Generate</button>
        </nav>
      )}
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow text-center">
        <StepNav step={step} setStep={setStep} disabledSteps={disabledSteps} />
        {renderStep()}
      </div>
      {showEditClient && editClient && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-sm relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => { setShowEditClient(false); setEditClient(null); }}
              title="Close"
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-2">Edit Client</h3>
            <ClientForm
              loading={clientLoading}
              name={editClient.name}
              companyName={editClient.company_name}
              jobTitle={editClient.job_title}
              linkedin={editClient.linkedin}
              website={editClient.website}
              image={editClient.image}
              colors={editClient.brand_guide?.colors?.join(', ') ?? ''}
              logo={editClient.brand_guide?.logo ?? ''}
              isEditMode={true}
              onAdd={async (
                name,
                company_name,
                job_title,
                linkedin,
                website,
                image,
                brand_guide
              ) => {
                setClientLoading(true);
                setError(null);
                // TODO: Implement updateClient logic
                // For now, just close modal and refresh clients
                setShowEditClient(false);
                setEditClient(null);
                const { data: updatedClients, error: getClientsError } = await getClients(user.id);
                setClientLoading(false);
                if (getClientsError) setError(getClientsError.message);
                else setClients(updatedClients || []);
              }}
            />
            {error && <div className="text-red-600 mb-2">{error}</div>}
          </div>
        </div>
      )}
    </>
  );
}