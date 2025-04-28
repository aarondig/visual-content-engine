"use client";

import { useState } from "react";

import { Client, BrandGuide } from "../types";

interface ClientFormProps {
  onAdd: (
    name: string,
    company_name: string,
    job_title: string,
    linkedin: string,
    website: string,
    image: string,
    brand_guide: BrandGuide
  ) => void;
  loading: boolean;
  // Optional initial values for editing
  name?: string;
  companyName?: string;
  jobTitle?: string;
  linkedin?: string;
  website?: string;
  image?: string;
  colors?: string; // comma-separated
  logo?: string;
  isEditMode?: boolean;
}

export default function ClientForm({
  onAdd, loading,
  name: initialName = "",
  companyName: initialCompanyName = "",
  jobTitle: initialJobTitle = "",
  linkedin: initialLinkedin = "",
  website: initialWebsite = "",
  image: initialImage = "",
  colors: initialColors = "",
  logo: initialLogo = "",
  isEditMode = false
}: ClientFormProps) {
  const [name, setName] = useState(initialName);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [linkedin, setLinkedin] = useState(initialLinkedin);
  const [website, setWebsite] = useState(initialWebsite);
  const [image, setImage] = useState(initialImage);
  const [colors, setColors] = useState(initialColors);
  const [logo, setLogo] = useState(initialLogo);

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

      <button
        type="submit"
        className="bg-blue-600 text-white rounded px-3 py-2 mt-2 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? (isEditMode ? "Saving..." : "Adding...") : (isEditMode ? "Save Changes" : "Add Client")}
      </button>
    </form>
  );
}
