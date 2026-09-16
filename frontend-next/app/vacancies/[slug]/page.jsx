"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function VacancyDetailPage() {
  const { slug } = useParams();
  const [vacancy, setVacancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:9000";

  useEffect(() => {
    if (!slug) return;
    const fetchVacancy = async () => {
      try {
        const res = await fetch(`${backend}/vacancies/${slug}`);
        if (!res.ok) throw new Error("Failed to fetch vacancy");
        const data = await res.json();
        // backend may wrap in { data: {...} }
        const v = data?.data || data;
        setVacancy(v);
      } catch (err) {
        console.error(err);
        setVacancy(null);
      } finally {
        setLoading(false);
      }
    };

    fetchVacancy();
  }, [slug]);

  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <Link href="/vacancies" className="text-sm text-gray-600 hover:underline">
        ← Back to vacancies
      </Link>

      {loading ? (
        <p className="mt-4">Loading...</p>
      ) : !vacancy ? (
        <p className="mt-4">Vacancy not found.</p>
      ) : (
        <article className="mt-6 border rounded p-6">
          <h1 className="text-2xl font-bold mb-2">{vacancy.title}</h1>
          <p className="text-sm text-gray-600">{vacancy.location} • {vacancy.department}</p>
          <p className="mt-2 text-gray-800">{vacancy.salaryRange}</p>

          <section className="mt-4 prose max-w-none">
            {/* We expect backend to provide sanitized HTML in descriptionHtml. */}
            {vacancy.descriptionHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: vacancy.descriptionHtml }}
              />
            ) : (
              <div className="text-gray-700">{vacancy.description || "No description."}</div>
            )}
          </section>
        </article>
      )}
    </main>
  );
}
