"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthForm from "../components/AuthForm";
import { ClientStepper, ClientEditDrawer } from "../components/ClientStepper";
import StepNavigation from "../components/StepNavigation";
import PostForm from "../components/PostForm";
import { AnimatePresence, motion } from "framer-motion";
import { getClients, addClient, deleteClient } from "../lib/clientService";
import { getPosts, addPost, deletePost } from "../lib/postService";
import { generateImageFromPrompt, postToVisualPrompt } from "../lib/replicateService";
import { generatePromptFromPost } from "../lib/openRouterService";
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

  // --- Auth state ---
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- Navigation state ---
  const [step, setStep] = useState<Step>(() => {
    if (DEV_MODE && typeof window !== "undefined") {
      const lastStep = localStorage.getItem("vce_last_step");
      const validSteps: Step[] = ["home", "choose_client", "add_post_content", "suggested_ideas", "visuals_generate"];
      if (lastStep && validSteps.includes(lastStep as Step)) return lastStep as Step;
      return "home";
    }
    return searchParams.get("step") as Step || "home";
  });

  // --- Client management state ---
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientLoading, setClientLoading] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [showEditClient, setShowEditClient] = useState(false);

  // --- Post management state ---
  const [posts, setPosts] = useState<any[]>([]);
  const [postContent, setPostContent] = useState('');
  const [lastSubmittedPostContent, setLastSubmittedPostContent] = useState('');
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // --- Prompt suggestion state ---
  const [promptInputs, setPromptInputs] = useState<string[]>(["", "", "", ""]); // 4 slots for custom prompts
  const [promptPairs, setPromptPairs] = useState<{ summary: string; prompt: string }[]>([]);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  // --- App-level error ---
  const [appError, setAppError] = useState<string | null>(null);

  // --- Visual selection state ---
  const [selectedVisual, setSelectedVisual] = useState<string | null>(null);
  const [visualRefs, setVisualRefs] = useState<string[]>([]);


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
    if (user) {
      getClients(user.id)
        .then(({ data, error }) => {
          if (error) setAppError(typeof error === 'string' ? error : (error as any)?.toString() || 'Unknown error');
          else setClients(data || []);
          setClientLoading(false);
        });
    } else {
      setClients([]);
    }
  }, [user]);

  useEffect(() => {
    if (selectedClient) {
      setPostLoading(true);
      getPosts(selectedClient.id)
        .then(({ data, error }) => {
          if (error) setPostError(typeof error === 'string' ? error : (error as any)?.toString() || 'Unknown error');
          else setPosts(data || []);
        })
        .finally(() => setPostLoading(false));
    } else {
      setPosts([]);
    }
  }, [selectedClient]);

  useEffect(() => {
    if (step === "suggested_ideas" && lastSubmittedPostContent.trim()) {
      setPromptLoading(true);
      setPromptError(null);
      generatePromptFromPost(lastSubmittedPostContent, undefined, selectedClient?.brand_guide, undefined)
        .then(({ promptPairs, error }) => {
          if (promptPairs) {
            setPromptPairs(promptPairs);
          } else {
            setPromptPairs([]);
            setPromptError(error || "No prompt suggestions could be generated.");
          }
        })
        .catch((err) => {
          setPromptPairs([]);
          setPromptError(typeof err === 'string' ? err : (err as any)?.toString() || "Prompt generation failed.");
        })
        .finally(() => setPromptLoading(false));
    }
    // Optionally, clear suggestions when leaving the step
    if (step !== "suggested_ideas") {
      setPromptPairs([]);
      setPromptError(null);
    }
  }, [step, lastSubmittedPostContent, selectedClient]);

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
        if (error) setAppError(typeof error === 'string' ? error : (error as any)?.toString() || 'Unknown error');
        else setGalleryPosts(data || []);
        setGalleryLoading(false);
      });
    }
  }, [step, user, selectedClient]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const idx = STEPS.findIndex(s => s.key === step);
      if (e.key === "ArrowRight" && idx < STEPS.length - 1) setStep(STEPS[idx + 1].key as Step);
      if (e.key === "ArrowLeft" && idx > 0) setStep(STEPS[idx - 1].key as Step);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [step]);

  const disabledSteps: Step[] = (() => {
    if (DEV_MODE) return [];
    const arr: Step[] = [];
    // Example: disable steps if no client
    if (!selectedClient) arr.push("choose_client", "add_post_content", "suggested_ideas", "visuals_generate");
    // Add more step requirements as needed
    return arr;
  })();

  const [galleryPosts, setGalleryPosts] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);

  function renderStep() {
    // --- HOME STEP ---
    if (step === "home") {
      return (
        <div>
          <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="client-select" className="text-sm font-medium">Client:</label>
              <div className="relative flex items-center gap-2">
                <select
                  id="client-select"
                  className="border rounded px-2 py-1 text-sm pr-12"
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
                {/* Edit & Delete buttons for selected client */}
                {selectedClient && (
                  <>
                    <button
                      className="ml-1 text-gray-500 hover:text-blue-600"
                      title="Edit client"
                      onClick={() => { setEditClient(selectedClient); setShowEditClient(true); }}
                      style={{ fontSize: 18 }}
                    >
                      ✏️
                    </button>
                    <button
                      className="ml-1 text-gray-500 hover:text-red-600"
                      title="Delete client"
                      onClick={async () => {
                        if (window.confirm(`Delete client '${selectedClient.name}'? This cannot be undone.`)) {
                          setClientLoading(true);
                          const { error } = await deleteClient(selectedClient.id);
                          if (error) setAppError(typeof error === 'string' ? error : (error as any)?.toString() || 'Unknown error');
                          else {
                            const { data: updatedClients } = await getClients(user.id);
                            setClients(updatedClients || []);
                            setSelectedClient(null);
                            setShowEditClient(false);
                          }
                          setClientLoading(false);
                        }
                      }}
                      style={{ fontSize: 18 }}
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
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
              <div className="bg-white rounded shadow-lg p-6 w-full max-w-xl relative text-left">
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                  onClick={() => setShowAddClient(false)}
                  title="Close"
                >
                  ×
                </button>
                <h3 className="text-lg font-bold mb-2 text-left">Add Client</h3>
                <ClientStepper
  onComplete={async (data) => {
    setClientLoading(true);
    setPostError(null);
    const { details, identity, guidelines } = data;
    // Build the BrandGuide object
    const brandGuide = {
      colors: [guidelines.primaryColor, guidelines.secondaryColor, guidelines.tertiaryColor].filter(Boolean),
      logo: (guidelines && "logo" in guidelines) ? String(guidelines.logo) : ""
    };
    // Compose client fields
    const name = `${details.firstName} ${details.lastName}`.trim();
    const company_name = details.companyName;
    const job_title = details.jobTitle;
    const linkedin = details.linkedin;
    const website = identity.brandWebsite;
    const image = details.image || "";
    // Call addClient with explicit arguments
    const { data: addedClient, error: addErr } = await addClient(
      user.id,
      name,
      company_name,
      job_title,
      linkedin,
      website,
      image,
      brandGuide
    );
    if (addErr) setPostError(typeof addErr === 'string' ? addErr : (addErr as any)?.toString() || 'Unknown error');
    else {
      setShowAddClient(false);
      // Refresh clients and auto-select the newly added client by ID
      const { data: updatedClients, error: getClientsError } = await getClients(user.id);
      if (getClientsError) setPostError(typeof getClientsError === 'string' ? getClientsError : (getClientsError as any)?.toString() || 'Unknown error');
      else {
        setClients(updatedClients || []);
        if (addedClient && addedClient[0]?.id) {
          const found = (updatedClients || []).find((c: any) => c.id === addedClient[0].id);
          if (found) setSelectedClient(found);
        }
      }
    }
    setClientLoading(false);
  }}
/>
                {postError && <div className="text-red-600 mb-2">{postError}</div>}
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
          <StepNavigation step={step} setStep={setStep} steps={STEPS} disabledSteps={disabledSteps} />
        </div>
      );
    }
    // --- CHOOSE CLIENT STEP ---
    if (step === "choose_client") {
      return (
        <div className="max-w-lg mx-auto mt-8">
          <h2 className="text-xl font-bold mb-4">Choose a Client</h2>
          {clients.length === 0 ? (
            <div className="text-gray-400 mb-4">No clients yet. Add one to get started!</div>
          ) : (
            <ul className="divide-y divide-gray-200 mb-6">
              {clients.map(client => (
                <li key={client.id} className="flex items-center gap-4 py-4 cursor-pointer hover:bg-gray-50 rounded px-2"
                  onClick={() => { setSelectedClient(client); setStep("add_post_content" as Step); }}
                >
                  {client.image ? (
                    <img src={client.image} alt={client.name} className="w-10 h-10 rounded-full object-cover border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">{client.name?.charAt(0) || "?"}</div>
                  )}
                  <div>
                    <div className="font-semibold">{client.name}</div>
                    <div className="text-xs text-gray-500">{client.company_name}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            className="bg-green-100 text-green-800 rounded px-4 py-2 text-sm font-medium hover:bg-green-200"
            onClick={() => setShowAddClient(true)}
          >
            + Add Client
          </button>
          <StepNavigation step={step} setStep={setStep} steps={STEPS} disabledSteps={disabledSteps} />
        </div>
      );
    }
    // --- ADD POST CONTENT STEP ---
    if (step === "add_post_content") {
      return (
        <div className="max-w-lg mx-auto mt-8">
          <h2 className="text-xl font-bold mb-4">Add Post Content</h2>
          {/* Minimal post creation form */}
          <div className="mb-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setPostLoading(true);
                setPostError(null);
                const { data, error } = await addPost(selectedClient.id, user.id, postContent);
                setPostLoading(false);
                if (error) {
                  setPostError(error?.message || (error as any)?.toString() || 'Unknown error');
                } else {
                  setLastSubmittedPostContent(postContent); // Save for prompt generation
                  setPostContent('');
                  setStep("suggested_ideas" as Step); // Immediately go to next step
                  // Prompt generation will happen in the next step
                }
              }}
              className="flex flex-col items-start gap-2"
            >
              <textarea
                className="w-full border rounded p-2"
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
                placeholder="Write a post..."
                required
                rows={3}
                disabled={postLoading}
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded"
                disabled={postLoading || !postContent.trim()}
              >
                {postLoading ? "Posting..." : "Add Post"}
              </button>
              {postError && <div className="text-red-600">{postError}</div>}
            </form>
          </div>

          {/* TODO: Visual reference upload UI */}
          <StepNavigation step={step} setStep={setStep} steps={STEPS} disabledSteps={disabledSteps} />
        </div>
      );
    }
    // --- SUGGESTED IDEAS STEP ---
    if (step === "suggested_ideas") {
      return (
        <div className="max-w-3xl mx-auto mt-8">
          <h2 className="text-xl font-bold mb-4">Suggested Visual Prompts</h2>
          {promptLoading ? (
            <div className="text-center text-gray-500">Generating prompt suggestions...</div>
          ) : promptError ? (
            <div className="text-center text-red-600">{promptError}</div>
          ) : promptPairs.length === 0 ? (
            <div className="text-center text-yellow-600">No prompt suggestions could be generated.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {promptPairs.map((pair, idx) => (
                <div key={idx} className="bg-white rounded shadow p-4 flex flex-col h-full">
                  <div className="font-semibold text-lg text-blue-700 text-left mb-2">{pair.summary}</div>
                </div>
              ))}
            </div>
          )}
          {/* Custom prompt input area */}
          <div className="mb-6">
            <label className="block font-semibold mb-2 text-gray-700">Custom Prompt</label>
            <textarea
              className="border rounded w-full p-2 min-h-[60px]"
              placeholder="Write your own prompt if the suggestions aren't great..."
              value={promptInputs[3] || ""}
              onChange={e => {
                const newInputs = [...promptInputs];
                newInputs[3] = e.target.value;
                setPromptInputs(newInputs);
              }}
            />
          </div>
          <StepNavigation step={step} setStep={setStep} steps={STEPS} disabledSteps={disabledSteps} />
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
          <StepNavigation step={step} setStep={setStep} steps={STEPS} disabledSteps={disabledSteps} />
          <h2 className="text-xl font-bold mb-4">Suggested Visual Prompts</h2>
          {promptLoading ? (
            <div className="text-center text-gray-500">Generating prompt suggestions...</div>
          ) : promptError ? (
            <div className="text-center text-red-600">{promptError}</div>
          ) : promptPairs.length === 0 ? (
            <div className="text-center text-yellow-600">No prompt suggestions could be generated.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {promptPairs.map((pair, idx) => (
                <div key={idx} className="bg-white rounded shadow p-4 flex flex-col h-full">
                  <div className="font-semibold text-lg text-blue-700 text-left mb-2">{pair.summary}</div>
                </div>
              ))}
            </div>
          )}
          {/* Custom prompt input area */}
          <div className="mb-6">
            <label className="block font-semibold mb-2 text-gray-700">Custom Prompt</label>
            <textarea
              className="border rounded w-full p-2 min-h-[60px]"
              placeholder="Write your own prompt if the suggestions aren't great..."
              value={promptInputs[3] || ""}
              onChange={e => {
                const newInputs = [...promptInputs];
                newInputs[3] = e.target.value;
                setPromptInputs(newInputs);
              }}
            />
          </div>
          <StepNavigation step={step} setStep={setStep} steps={STEPS} disabledSteps={disabledSteps} />
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
          <StepNavigation step={step} setStep={setStep} steps={STEPS} disabledSteps={disabledSteps} />
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
      {/* Horizontal stepper for main journey */}
      <div className="max-w-2xl mx-auto mt-10">
        <ol className="flex justify-between items-center mb-6 px-2 select-none" aria-label="Progress">
          {[
            { key: "choose_client", label: "Choose Client" },
            { key: "add_post_content", label: "Add Post Content" },
            { key: "suggested_ideas", label: "Suggested Ideas" },
            { key: "visuals_generate", label: "Visuals Generate" }
          ].map((s, idx, arr) => (
            <li key={s.key} className="flex-1 flex items-center">
              <div className={`flex items-center gap-2 ${step === s.key ? "font-bold text-blue-600" : "text-gray-500"}`}>
                <div className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${step === s.key ? "border-blue-600 bg-blue-50" : "border-gray-300 bg-white"}`}>{idx + 1}</div>
                <span className="text-sm">{s.label}</span>
              </div>
              {idx < arr.length - 1 && <div className="flex-1 h-0.5 bg-gray-200 mx-2" />}
            </li>
          ))}
        </ol>
      </div>
      <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow text-left">
        {renderStep()}
      </div>
      {showEditClient && editClient && (
        <ClientEditDrawer client={editClient} onClose={() => { setShowEditClient(false); setEditClient(null); }} />
      )}
    </>
  );
}