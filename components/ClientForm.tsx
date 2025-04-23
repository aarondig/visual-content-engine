"use client";

import { useState } from "react";

import { Client } from "../types";

interface ClientFormProps {
  onAdd: (
    name: string,
    company_name: string,
    job_title: string,
    linkedin: string,
    website: string,
    image: string,
    brand_guide: Record<string, any>
  ) => void;
  loading: boolean;
}

export default function ClientForm({ onAdd, loading }: ClientFormProps) {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [website, setWebsite] = useState("");
  const [image, setImage] = useState("");
  const [colors, setColors] = useState("");
  const [logo, setLogo] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const brandGuide = {
      colors: colors
        .split(",")
        .map(c => c.trim())
        .filter(Boolean),
      logo: logo.trim()
    };
    onAdd(
      name,
      companyName,
      jobTitle,
      linkedin,
      website,
      image,
      brandGuide
    );
    setName("");
    setCompanyName("");
    setJobTitle("");
    setLinkedin("");
    setWebsite("");
    setImage("");
    setColors("");
    setLogo("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-6 p-4 border rounded bg-gray-50">
      <label className="font-medium">Client Name</label>
      <input
        className="border px-2 py-1 rounded"
        value={name}
        onChange={e => setName(e.target.value)}
        required
        placeholder="e.g. John Doe"
      />
      <label className="font-medium">Company Name</label>
      <input
        className="border px-2 py-1 rounded"
        value={companyName}
        onChange={e => setCompanyName(e.target.value)}
        required
        placeholder="e.g. Acme Corp"
      />
      <label className="font-medium">Job Title</label>
      <input
        className="border px-2 py-1 rounded"
        value={jobTitle}
        onChange={e => setJobTitle(e.target.value)}
        required
        placeholder="e.g. Marketing Director"
      />
      <label className="font-medium">LinkedIn URL</label>
      <input
        className="border px-2 py-1 rounded"
        value={linkedin}
        onChange={e => setLinkedin(e.target.value)}
        placeholder="https://linkedin.com/in/username"
      />
      <label className="font-medium">Website</label>
      <input
        className="border px-2 py-1 rounded"
        value={website}
        onChange={e => setWebsite(e.target.value)}
        placeholder="https://company.com"
      />
      <label className="font-medium">Profile Image URL</label>
      <input
        className="border px-2 py-1 rounded"
        value={image}
        onChange={e => setImage(e.target.value)}
        placeholder="https://..."
      />
      <label className="font-medium">Brand Colors (comma separated)</label>
      <input
        className="border px-2 py-1 rounded"
        value={colors}
        onChange={e => setColors(e.target.value)}
        placeholder="#123456, #abcdef"
      />
      <label className="font-medium">Logo URL</label>
      <input
        className="border px-2 py-1 rounded"
        value={logo}
        onChange={e => setLogo(e.target.value)}
        placeholder="https://..."
      />
      <button
        type="submit"
        className="bg-blue-600 text-white rounded px-3 py-2 mt-2 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Adding..." : "Add Client"}
      </button>
    </form>
  );
}
