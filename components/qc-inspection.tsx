"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type Inspection = {
  result: string;
  stitchingPassed: boolean;
  measurementPassed: boolean;
  finishingPassed: boolean;
  rejectionReason: string | null;
  reworkStage: string | null;
  defectPhotoPath: string | null;
} | null;

const checklist = [
  { key: "stitching", title: "Stitching quality", description: "Seams, thread finish and construction" },
  { key: "measurement", title: "Measurements & sizes", description: "Measurements match the order specification" },
  { key: "finishing", title: "Finishing & appearance", description: "Clean finish, colour and overall appearance" },
] as const;

function photoPaths(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((path): path is string => typeof path === "string") : [value];
  } catch {
    return [value];
  }
}

export function QcInspection({ orderId, inspection, canInspect }: { orderId: string; inspection: Inspection; canInspect: boolean }) {
  const router = useRouter();
  const [result, setResult] = useState(inspection?.result === "PENDING" || !inspection ? "PASSED" : inspection.result);
  const [reason, setReason] = useState(inspection?.rejectionReason || "");
  const [reworkStage, setRework] = useState(inspection?.reworkStage || "STITCHING");
  const [checks, setChecks] = useState({
    stitching: inspection?.stitchingPassed || false,
    measurement: inspection?.measurementPassed || false,
    finishing: inspection?.finishingPassed || false,
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const savedPhotos = photoPaths(inspection?.defectPhotoPath);

  async function submit() {
    setSaving(true);
    const form = new FormData();
    form.set("result", result);
    form.set("reason", reason);
    form.set("reworkStage", reworkStage);
    Object.entries(checks).forEach(([key, value]) => form.set(key, String(value)));
    photos.forEach((photo) => form.append("photos", photo));
    const response = await fetch(`/api/orders/${orderId}/qc`, { method: "POST", body: form });
    const body = await response.json();
    setMessage(response.ok ? "QC inspection saved." : body.error || "Unable to save QC.");
    setSaving(false);
    if (response.ok) router.refresh();
  }

  const savedResult = inspection?.result || "PENDING";

  return (
    <section className="detail-section qc-inspection">
      <div className="qc-heading">
        <div className="qc-heading-icon" aria-hidden="true">✓</div>
        <div>
          <p className="eyebrow">Quality control gate</p>
          <h2>{canInspect ? "Inspection before Packing" : "QC status"}</h2>
          <p className="qc-subtitle">Confirm every quality check before releasing this order to Packing.</p>
        </div>
        <span className={`qc-result ${savedResult.toLowerCase()}`}>{savedResult.replaceAll("_", " ")}</span>
      </div>

      {canInspect ? (
        <div className="qc-form">
          <div className="qc-checklist-heading">
            <div><b>Inspection checklist</b><span>Tap each item after checking the garments.</span></div>
            <strong>{passedChecks} / {checklist.length} checked</strong>
          </div>

          <div className="qc-checks">
            {checklist.map(({ key, title, description }) => (
              <label className={checks[key] ? "is-checked" : ""} key={key}>
                <input type="checkbox" checked={checks[key]} onChange={(event) => setChecks({ ...checks, [key]: event.target.checked })} />
                <span className="qc-checkmark" aria-hidden="true">✓</span>
                <span><b>{title}</b><small>{description}</small></span>
              </label>
            ))}
          </div>

          <div className="qc-fields">
            <label className="qc-field">
              <span>Inspection result</span>
              <select value={result} onChange={(event) => setResult(event.target.value)}>
                <option value="PASSED">Passed — allow Packing</option>
                <option value="REWORK_REQUIRED">Rework required</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <small>{result === "PASSED" ? "Packing can begin after you save." : "The order will not move to Packing."}</small>
            </label>

            {result === "REWORK_REQUIRED" ? (
              <label className="qc-field">
                <span>Send rework to</span>
                <select value={reworkStage} onChange={(event) => setRework(event.target.value)}>
                  <option value="CUTTING">Cutting</option>
                  <option value="STITCHING">Stitching</option>
                  <option value="QUALITY_CHECK">Quality check</option>
                </select>
              </label>
            ) : null}

            {result !== "PASSED" ? (
              <label className="qc-field qc-reason">
                <span>Rejection / rework reason</span>
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} required rows={3} placeholder="Describe the defect and the correction required…" />
              </label>
            ) : null}

            <label className="qc-photo">
              <input type="file" accept="image/*" multiple onChange={(event) => setPhotos(Array.from(event.target.files || []))} />
              <span className="qc-photo-icon" aria-hidden="true">＋</span>
              <span><b>{photos.length ? `${photos.length} ${photos.length === 1 ? "photo" : "photos"} selected` : "Add defect photos"}</b><small>{photos.length ? photos.map((photo) => photo.name).join(", ") : "Optional · Multiple images · Maximum 10 MB each"}</small></span>
              <em>{photos.length ? "Change selection" : "Choose photos"}</em>
            </label>
            {savedPhotos.length ? <div className="qc-saved-photos"><span>Saved defect photos</span><div>{savedPhotos.map((photo, index) => <a href={photo} target="_blank" rel="noreferrer" key={`${photo}-${index}`}>Photo {index + 1}</a>)}</div></div> : null}
          </div>

          <div className="qc-submit-row">
            <p className={message ? "has-message" : ""} aria-live="polite">{message || "Your inspection will be recorded in the order history."}</p>
            <button className="primary" disabled={saving} onClick={submit}>{saving ? "Saving inspection…" : "Save QC inspection"}</button>
          </div>
        </div>
      ) : (
        <div className="qc-manager-view">
          <div className="qc-readonly">
            <span aria-hidden="true">{inspection?.result === "PASSED" ? "✓" : "○"}</span>
            <p>{inspection?.result === "PASSED" ? "QC passed — this order can proceed to Packing." : inspection?.result?.replaceAll("_", " ") || "QC inspection pending."}</p>
          </div>
          <div className="qc-manager-photos">
            <div className="qc-photo-gallery-heading"><div><b>QC defect photos</b><small>Uploaded by the quality inspector</small></div><span>{savedPhotos.length} {savedPhotos.length === 1 ? "photo" : "photos"}</span></div>
            {savedPhotos.length ? <div className="qc-photo-gallery">{savedPhotos.map((photo, index) => <a href={photo} target="_blank" rel="noreferrer" key={`${photo}-${index}`}><img src={photo} alt={`QC defect photo ${index + 1}`} /><span><b>Photo {index + 1}</b><small>Open original ↗</small></span></a>)}</div> : <div className="qc-no-photos"><span aria-hidden="true">▧</span><p>No defect photos were uploaded for this inspection.</p></div>}
          </div>
        </div>
      )}
    </section>
  );
}
