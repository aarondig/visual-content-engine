"use client";

import { useState } from "react";

interface PostFormProps {
  onAdd: (content: string) => void;
  loading: boolean;
}

export default function PostForm({ onAdd, loading }: PostFormProps) {
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAdd(content);
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-4">
      <textarea
        className="border px-2 py-1 rounded min-h-[60px]"
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Write a LinkedIn post..."
        required
      />
      <button
        type="submit"
        className="bg-green-600 text-white rounded px-3 py-2 mt-2 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Posting..." : "Add Post"}
      </button>
    </form>
  );
}
