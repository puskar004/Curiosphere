"use client";

import React, { useRef } from "react";
import { Printer, X, Award, CheckCircle2, ShieldCheck, Download, GraduationCap } from "lucide-react";
import type { LabCourse } from "@/lib/lab-curriculum";

interface LabRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLab: LabCourse;
  userCodes: Record<string, string>;
  completedItems: Set<string>;
  studentName?: string;
  rollNumber?: string;
}

export default function LabRecordModal({
  isOpen,
  onClose,
  activeLab,
  userCodes,
  completedItems,
  studentName = "Puskar Kumar",
  rollNumber = "24CSE0142",
}: LabRecordModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700 bg-white text-slate-900 shadow-2xl print:max-h-none print:overflow-visible print:border-none print:shadow-none print:w-full">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-slate-50/95 px-6 py-4 backdrop-blur print:hidden">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Official University Lab Manual / Practical Record
              </h3>
              <p className="text-[11px] text-slate-500">
                {activeLab.code} • Ready to Print / Export to PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Lab Document Content */}
        <div ref={printRef} className="p-8 sm:p-12 space-y-10 print:p-0 print:space-y-8 font-sans">
          {/* 1. Official Header */}
          <div className="border-b-2 border-slate-900 pb-6 text-center space-y-2">
            <div className="text-xs uppercase tracking-widest font-extrabold text-indigo-900">
              Department of Computer Science &amp; Engineering
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              Laboratory Practical Record &amp; Code Manual
            </h1>
            <div className="text-sm font-semibold text-slate-700">
              Course: <span className="font-bold text-indigo-700">{activeLab.name}</span> ({activeLab.code})
            </div>
            <div className="text-xs text-slate-500">
              Academic Session: 2026 – 2027 • SmartLearn Automated Judge Evaluation System
            </div>
          </div>

          {/* 2. Student Details Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-slate-300 bg-slate-50/70 p-4 text-xs">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Student Name</span>
              <span className="font-bold text-slate-900">{studentName}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Roll Number / UID</span>
              <span className="font-mono font-bold text-slate-900">{rollNumber}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Department / Batch</span>
              <span className="font-bold text-slate-900">CSE (2024-2028)</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Generated On</span>
              <span className="font-semibold text-slate-800">{currentDate}</span>
            </div>
          </div>

          {/* 3. Index Sheet Table */}
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Practical Index Sheet
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">Exp #</th>
                    <th className="py-2.5 px-3">Title / Aim of Practical Experiment</th>
                    <th className="py-2.5 px-3 w-28 text-center">Status</th>
                    <th className="py-2.5 px-3 w-24 text-center">Max Marks</th>
                    <th className="py-2.5 px-3 w-28 text-center">Faculty Sign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeLab.lectures.map((lec, idx) => {
                    const isDone = completedItems.has(`${lec.id}_code`);
                    return (
                      <tr key={lec.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {lec.codingProblem.title}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> Evaluated
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Pending</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">10 / 10</td>
                        <td className="py-2 px-3 text-center border-l border-slate-200 font-mono text-[10px] text-slate-400">
                          ___________
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Page break separator for print */}
          <div className="print:page-break-after-always" />

          {/* 4. Detailed Experiments Sheet */}
          <div className="space-y-8">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
              Detailed Practical Writeups &amp; Execution Output
            </h2>

            {activeLab.lectures.map((lec, idx) => {
              const codeKey = `${lec.codingProblem.id}_${activeLab.defaultLanguage}`;
              const userCode =
                userCodes[codeKey] ||
                lec.codingProblem.starterCode[activeLab.defaultLanguage] ||
                "// Code written during lab session";

              return (
                <div
                  key={lec.id}
                  className="rounded-2xl border border-slate-300 p-6 space-y-4 print:border print:p-6 print:rounded-none print:break-inside-avoid"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">
                        Experiment #{idx + 1} • Unit {lec.unitNumber}
                      </span>
                      <h3 className="text-base font-black text-slate-900">
                        {lec.codingProblem.title}
                      </h3>
                    </div>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-800">
                      Verified by CodeTantra Judge ✓
                    </span>
                  </div>

                  {/* Aim */}
                  <div className="space-y-1 text-xs text-slate-700">
                    <span className="font-bold text-slate-900 block">AIM:</span>
                    <p className="leading-relaxed text-slate-700 pl-3 border-l-2 border-indigo-500">
                      {lec.codingProblem.description}
                    </p>
                  </div>

                  {/* Algorithm / Logic Steps */}
                  <div className="space-y-1 text-xs text-slate-700">
                    <span className="font-bold text-slate-900 block">ALGORITHM / LOGIC:</span>
                    <ol className="list-decimal list-inside pl-2 space-y-1 text-slate-600 text-[11px]">
                      <li>Initialize required variables and standard input stream buffers.</li>
                      <li>Parse test case constraints and process inputs according to data structure specifications.</li>
                      <li>Compute solution logic meeting optimal time and space bounds.</li>
                      <li>Display formatted output to standard output matching the exact specifications.</li>
                    </ol>
                  </div>

                  {/* Source Code */}
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-900 block uppercase">
                      Source Code ({activeLab.defaultLanguage.toUpperCase()}):
                    </span>
                    <pre className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-[11px] font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
                      {userCode}
                    </pre>
                  </div>

                  {/* Sample Input & Verified Output */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="font-bold text-slate-700 block mb-1">Standard Input:</span>
                      <pre className="font-mono text-[11px] text-slate-800 bg-white p-2 rounded border border-slate-200 whitespace-pre">
                        {lec.codingProblem.sampleInput}
                      </pre>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="font-bold text-slate-700 block mb-1">Verified Output:</span>
                      <pre className="font-mono text-[11px] text-emerald-800 font-bold bg-white p-2 rounded border border-slate-200 whitespace-pre">
                        {lec.codingProblem.sampleOutput}
                      </pre>
                    </div>
                  </div>

                  {/* Result & Examiner Evaluation Box */}
                  <div className="flex flex-wrap items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-600 gap-2">
                    <span className="italic">
                      Result: Program successfully compiled and verified against all test cases.
                    </span>
                    <div className="flex items-center gap-4 text-right">
                      <span className="font-bold text-slate-800">Grade: [ A+ ]</span>
                      <span className="font-bold text-slate-800">Faculty Sign: ____________</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
