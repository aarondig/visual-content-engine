import React, { useState } from "react";

// Types for each step
interface ClientDetails {
  firstName: string;
  lastName: string;
  companyName: string;
  jobTitle: string;
  linkedin: string;
  image: string | null;
}

interface BrandIdentity {
  brandName: string;
  brandWebsite: string;
}

interface BrandGuidelines {
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  guidelineImages: string[];
}

interface ClientStepperProps {
  onComplete: (data: {
    details: ClientDetails;
    identity: BrandIdentity;
    guidelines: BrandGuidelines;
  }) => void;
}

export function ClientStepper({ onComplete }: ClientStepperProps) {
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<ClientDetails>({
    firstName: "",
    lastName: "",
    companyName: "",
    jobTitle: "",
    linkedin: "",
    image: null,
  });
  // Brand name defaults to company name, but can be changed
  const [identity, setIdentity] = useState<BrandIdentity>({
    brandName: details.companyName,
    brandWebsite: "",
  });
  const [guidelines, setGuidelines] = useState<BrandGuidelines>({
    primaryColor: "",
    secondaryColor: "",
    tertiaryColor: "",
    guidelineImages: [],
  });

  // When company name changes, update brand name if it hasn't been changed by user
  React.useEffect(() => {
    setIdentity(prev =>
      prev.brandName === "" || prev.brandName === details.companyName
        ? { ...prev, brandName: details.companyName }
        : prev
    );
  }, [details.companyName]);

  return (
    <div className="w-full max-w-xl mx-auto p-8 bg-white rounded shadow">
      <div className="mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
          {/* Profile image preview */}
          {details.image ? (
            <img src={details.image} alt="Client" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl text-gray-400">👤</span>
          )}
        </div>
        <div>
          <div className="font-bold text-lg">
            {details.firstName || "New Client"} {details.lastName}
          </div>
          <div className="text-gray-500 text-sm">{details.companyName}</div>
        </div>
      </div>
      {/* Step navigation */}
      <div className="flex gap-2 mb-8">
        <button className={step === 0 ? "font-bold underline" : ""} onClick={() => setStep(0)}>Client Details</button>
        <button className={step === 1 ? "font-bold underline" : ""} onClick={() => setStep(1)}>Brand Identity</button>
        <button className={step === 2 ? "font-bold underline" : ""} onClick={() => setStep(2)}>Brand Guidelines</button>
        <button className={step === 3 ? "font-bold underline" : ""} onClick={() => setStep(3)}>Review</button>
      </div>
      {step === 0 && (
        <div>
          <label>First Name</label>
          <input className="border rounded p-2 w-full mb-2" value={details.firstName} onChange={e => setDetails(d => ({ ...d, firstName: e.target.value }))} />
          <label>Last Name</label>
          <input className="border rounded p-2 w-full mb-2" value={details.lastName} onChange={e => setDetails(d => ({ ...d, lastName: e.target.value }))} />
          <label>Company Name</label>
          <input className="border rounded p-2 w-full mb-2" value={details.companyName} onChange={e => setDetails(d => ({ ...d, companyName: e.target.value }))} />
          <label>Job Title</label>
          <input className="border rounded p-2 w-full mb-2" value={details.jobTitle} onChange={e => setDetails(d => ({ ...d, jobTitle: e.target.value }))} />
          <label>LinkedIn</label>
          <input className="border rounded p-2 w-full mb-2" value={details.linkedin} onChange={e => setDetails(d => ({ ...d, linkedin: e.target.value }))} />
          <label>Photo</label>
          <input type="file" accept="image/*" onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => setDetails(d => ({ ...d, image: reader.result as string }));
              reader.readAsDataURL(file);
            }
          }} />
        </div>
      )}
      {step === 1 && (
        <div>
          <label>Brand Name</label>
          <input className="border rounded p-2 w-full mb-2" value={identity.brandName} onChange={e => setIdentity(b => ({ ...b, brandName: e.target.value }))} />
          <label>Brand Website</label>
          <input className="border rounded p-2 w-full mb-2" value={identity.brandWebsite} onChange={e => setIdentity(b => ({ ...b, brandWebsite: e.target.value }))} />
        </div>
      )}
      {step === 2 && (
        <div>
          <label>Primary Color</label>
          <input type="color" className="w-10 h-10 mr-2" value={guidelines.primaryColor} onChange={e => setGuidelines(g => ({ ...g, primaryColor: e.target.value }))} />
          <input className="border rounded p-2 w-32 mb-2" value={guidelines.primaryColor} onChange={e => setGuidelines(g => ({ ...g, primaryColor: e.target.value }))} placeholder="#000000" />
          <label>Secondary Color</label>
          <input type="color" className="w-10 h-10 mr-2" value={guidelines.secondaryColor} onChange={e => setGuidelines(g => ({ ...g, secondaryColor: e.target.value }))} />
          <input className="border rounded p-2 w-32 mb-2" value={guidelines.secondaryColor} onChange={e => setGuidelines(g => ({ ...g, secondaryColor: e.target.value }))} placeholder="#FFFFFF" />
          <label>Tertiary Color</label>
          <input type="color" className="w-10 h-10 mr-2" value={guidelines.tertiaryColor} onChange={e => setGuidelines(g => ({ ...g, tertiaryColor: e.target.value }))} />
          <input className="border rounded p-2 w-32 mb-2" value={guidelines.tertiaryColor} onChange={e => setGuidelines(g => ({ ...g, tertiaryColor: e.target.value }))} placeholder="#CCCCCC" />
          <label>Brand Guidelines Images</label>
          <input type="file" accept="image/*" multiple onChange={e => {
            const files = Array.from(e.target.files || []);
            files.forEach(file => {
              const reader = new FileReader();
              reader.onload = () => setGuidelines(g => ({ ...g, guidelineImages: [...g.guidelineImages, reader.result as string] }));
              reader.readAsDataURL(file);
            });
          }} />
          <div className="flex gap-2 mt-2">
            {guidelines.guidelineImages.map((img, i) => (
              <img key={i} src={img} className="w-16 h-16 rounded object-cover border" alt="Brand Asset" />
            ))}
          </div>
        </div>
      )}
      {step === 3 && (
        <div>
          <h3 className="font-bold mb-2">Review Client</h3>
          <table className="w-full text-left border-separate border-spacing-y-2">
            <tbody>
              <tr>
                <td className="font-semibold">First Name</td>
                <td><input className="border rounded p-1 w-full" value={details.firstName} onChange={e => setDetails(d => ({ ...d, firstName: e.target.value }))} /></td>
              </tr>
              <tr>
                <td className="font-semibold">Last Name</td>
                <td><input className="border rounded p-1 w-full" value={details.lastName} onChange={e => setDetails(d => ({ ...d, lastName: e.target.value }))} /></td>
              </tr>
              <tr>
                <td className="font-semibold">Company</td>
                <td><input className="border rounded p-1 w-full" value={details.companyName} onChange={e => setDetails(d => ({ ...d, companyName: e.target.value }))} /></td>
              </tr>
              <tr>
                <td className="font-semibold">Job Title</td>
                <td><input className="border rounded p-1 w-full" value={details.jobTitle} onChange={e => setDetails(d => ({ ...d, jobTitle: e.target.value }))} /></td>
              </tr>
              <tr>
                <td className="font-semibold">LinkedIn</td>
                <td><input className="border rounded p-1 w-full" value={details.linkedin} onChange={e => setDetails(d => ({ ...d, linkedin: e.target.value }))} /></td>
              </tr>
              <tr>
                <td className="font-semibold">Photo</td>
                <td>
                  {details.image ? (
                    <img src={details.image} alt="Client" className="w-12 h-12 rounded object-cover inline-block mr-2 align-middle" />
                  ) : (
                    <span className="text-gray-400 mr-2">No image</span>
                  )}
                  <input type="file" accept="image/*" className="inline-block align-middle" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => setDetails(d => ({ ...d, image: reader.result as string }));
                      reader.readAsDataURL(file);
                    }
                  }} />
                </td>
              </tr>
              <tr>
                <td className="font-semibold">Brand Name</td>
                <td><input className="border rounded p-1 w-full" value={identity.brandName} onChange={e => setIdentity(b => ({ ...b, brandName: e.target.value }))} /></td>
              </tr>
              <tr>
                <td className="font-semibold">Brand Website</td>
                <td><input className="border rounded p-1 w-full" value={identity.brandWebsite} onChange={e => setIdentity(b => ({ ...b, brandWebsite: e.target.value }))} /></td>
              </tr>
              <tr>
                <td className="font-semibold">Primary Color</td>
                <td>
                  <input type="color" className="w-8 h-8 mr-2 align-middle" value={guidelines.primaryColor} onChange={e => setGuidelines(g => ({ ...g, primaryColor: e.target.value }))} />
                  <input className="border rounded p-1 w-24 align-middle" value={guidelines.primaryColor} onChange={e => setGuidelines(g => ({ ...g, primaryColor: e.target.value }))} />
                </td>
              </tr>
              <tr>
                <td className="font-semibold">Secondary Color</td>
                <td>
                  <input type="color" className="w-8 h-8 mr-2 align-middle" value={guidelines.secondaryColor} onChange={e => setGuidelines(g => ({ ...g, secondaryColor: e.target.value }))} />
                  <input className="border rounded p-1 w-24 align-middle" value={guidelines.secondaryColor} onChange={e => setGuidelines(g => ({ ...g, secondaryColor: e.target.value }))} />
                </td>
              </tr>
              <tr>
                <td className="font-semibold">Tertiary Color</td>
                <td>
                  <input type="color" className="w-8 h-8 mr-2 align-middle" value={guidelines.tertiaryColor} onChange={e => setGuidelines(g => ({ ...g, tertiaryColor: e.target.value }))} />
                  <input className="border rounded p-1 w-24 align-middle" value={guidelines.tertiaryColor} onChange={e => setGuidelines(g => ({ ...g, tertiaryColor: e.target.value }))} />
                </td>
              </tr>
              <tr>
                <td className="font-semibold">Brand Images</td>
                <td>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {guidelines.guidelineImages.map((img, i) => (
                      <img key={i} src={img} className="w-12 h-12 rounded object-cover border" alt="Brand Asset" />
                    ))}
                  </div>
                  <input type="file" accept="image/*" multiple onChange={e => {
                    const files = Array.from(e.target.files || []);
                    files.forEach(file => {
                      const reader = new FileReader();
                      reader.onload = () => setGuidelines(g => ({ ...g, guidelineImages: [...g.guidelineImages, reader.result as string] }));
                      reader.readAsDataURL(file);
                    });
                  }} />
                </td>
              </tr>
            </tbody>
          </table>
          <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded" onClick={() => onComplete({ details, identity, guidelines })}>Save Client</button>
        </div>
      )}
      <div className="flex justify-between mt-8">
        <button disabled={step === 0} onClick={() => setStep(s => Math.max(s - 1, 0))}>Back</button>
        <button disabled={step === 3} onClick={() => setStep(s => Math.min(s + 1, 3))}>Next</button>
      </div>
    </div>
  );
}

// Drawer + Tabs UI for editing (scaffold)
export function ClientEditDrawer({ client, onClose }: { client: any; onClose: () => void }) {
  const [tab, setTab] = useState<'details' | 'identity' | 'guidelines'>('details');
  return (
    <div className="fixed inset-0 flex z-50">
      {/* Drawer */}
      <div className="w-80 bg-white border-r p-6 flex flex-col">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden mb-2">
            {client.image ? <img src={client.image} alt="Client" className="w-full h-full object-cover" /> : <span className="text-3xl text-gray-400">👤</span>}
          </div>
          <div className="font-bold text-lg text-center">{client.firstName} {client.lastName}</div>
        </div>
        <div className="flex flex-col gap-2">
          <button className={tab === 'details' ? 'font-bold underline' : ''} onClick={() => setTab('details')}>Client Details</button>
          <button className={tab === 'identity' ? 'font-bold underline' : ''} onClick={() => setTab('identity')}>Brand Identity</button>
          <button className={tab === 'guidelines' ? 'font-bold underline' : ''} onClick={() => setTab('guidelines')}>Brand Guidelines</button>
        </div>
        <button className="mt-auto text-gray-500 hover:underline" onClick={onClose}>Close</button>
      </div>
      {/* Tab Content */}
      <div className="flex-1 bg-gray-50 p-8 overflow-y-auto">
        {tab === 'details' && (
          <div>
            <h3 className="font-bold mb-2">Edit Client Details</h3>
            {/* ...fields and save button... */}
          </div>
        )}
        {tab === 'identity' && (
          <div>
            <h3 className="font-bold mb-2">Edit Brand Identity</h3>
            {/* ...fields and save button... */}
          </div>
        )}
        {tab === 'guidelines' && (
          <div>
            <h3 className="font-bold mb-2">Edit Brand Guidelines</h3>
            {/* ...fields and save button... */}
          </div>
        )}
      </div>
    </div>
  );
}
