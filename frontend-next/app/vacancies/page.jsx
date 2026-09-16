"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function VacanciesPage() {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVacancies = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:9000"}/vacancies`
        );
        if (!res.ok) throw new Error("Failed to fetch vacancies");
        const data = await res.json();
        setVacancies(data?.data || data || []);
      } catch (err) {
        console.error(err);
        setVacancies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVacancies();
  }, []);

  return (
    <main className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Open Vacancies</h1>

      {loading ? (
        <p>Loading...</p>
      ) : vacancies.length === 0 ? (
        <p>No open vacancies at the moment. Check back later.</p>
      ) : (
        <ul className="space-y-4">
          {vacancies.map((v) => (
            <li key={v._id} className="border rounded p-4">
              <h2 className="text-xl font-semibold">{v.title}</h2>
              <p className="text-sm text-gray-600">{v.location} • {v.department}</p>
              <p className="mt-2 text-gray-800">{v.salaryRange}</p>
              <div className="mt-3">
                <Link href={`/vacancies/${v.slug || v._id}`} className="text-red-600 hover:underline">
                  View details
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
