"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:9000";

export default function AdminVacanciesList() {
  const [roleOk, setRoleOk] = useState(false);
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const role = typeof window !== 'undefined' ? localStorage.getItem('je-user-role') : null;
    setRoleOk(role === 'hr' || role === 'admin');
  }, []);

  useEffect(() => {
    if (!roleOk) return;
    const fetchList = async () => {
      try {
        const res = await fetch(`${backend}/vacancies`);
        if (!res.ok) throw new Error('Failed to fetch vacancies');
        const data = await res.json();
        setVacancies(data?.data || data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [roleOk]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = { title, slug, location, department, salaryRange, descriptionHtml };
      const res = await fetch(`${backend}/vacancies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server responded ${res.status}: ${text}`);
      }
      const data = await res.json();
      setMessage({ type: 'success', text: 'Vacancy created.' });
      // Refresh list
      setVacancies((prev) => [data?.data || data, ...prev]);
      // Clear form
      setTitle(''); setSlug(''); setLocation(''); setDepartment(''); setSalaryRange(''); setDescriptionHtml('');
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!roleOk) {
    return (
      <main className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold">Admin: Vacancies</h1>
        <p className="mt-4 text-red-600">Access denied. You must be an HR or admin user to view this page.</p>
        <p className="mt-2">For local testing, set <code>localStorage.setItem('je-user-role','hr')</code> in the browser console. See README for details.</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin: Vacancies</h1>
        <div className="space-x-2">
          <button onClick={() => setShowForm((s) => !s)} className="bg-blue-600 text-white px-3 py-1 rounded">{showForm ? 'Close' : 'New vacancy'}</button>
          <Link href="/vacancies" className="text-sm text-gray-600 hover:underline">View public list</Link>
        </div>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mt-6 space-y-4 border rounded p-4 bg-white">
          <div>
            <label className="block text-sm font-medium">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full border rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Slug (url)</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 block w-full border rounded p-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 block w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Department</label>
              <input value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1 block w-full border rounded p-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Salary range</label>
            <input value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} className="mt-1 block w-full border rounded p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium">Description</label>
            <div className="mt-2">
              <ReactQuill value={descriptionHtml} onChange={setDescriptionHtml} />
            </div>
          </div>

          <div>
            <button type="submit" disabled={submitting} className="bg-green-600 text-white px-4 py-2 rounded">
              {submitting ? 'Submitting...' : 'Create vacancy'}
            </button>
          </div>

          {message && (
            <div className={`p-3 rounded ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {message.text}
            </div>
          )}

        </form>
      )}

      {loading ? (
        <p className="mt-4">Loading...</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {vacancies.length === 0 && <li>No vacancies found.</li>}
          {vacancies.map((v) => (
            <li key={v.id || v.slug} className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Link href={`/vacancies/${v.slug}`} className="text-lg font-semibold hover:underline">{v.title}</Link>
                  <div className="text-sm text-gray-600">{v.location} • {v.department}</div>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500 mr-3">{v.slug}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <p>TODO: If backend is not available, create vacancies with:</p>
        <pre className="bg-gray-100 rounded p-2 mt-2">curl -X POST {backend}/vacancies -H "Content-Type: application/json" -d '{"title":"Test","slug":"test","descriptionHtml":"&lt;p&gt;Hello&lt;/p&gt;"}'</pre>
      </div>
    </main>
  );
}
