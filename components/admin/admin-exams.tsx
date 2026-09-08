"use client"

import type React from "react"

import { useState } from "react"
import { Search, PlusCircle, Download, Edit, Trash2, Eye, Calendar, Clock, Users, FileText } from "lucide-react"

export default function AdminExams() {
  const [showAddModal, setShowAddModal] = useState(false)

  // Sample exam data
  const exams = [
    {
      id: 1,
      name: "JEE Mains",
      date: "2023-05-15",
      duration: "3 hours",
      totalStudents: 543,
      status: "Completed",
      subjects: ["Physics", "Chemistry", "Mathematics"],
    },
    {
      id: 2,
      name: "VITEEE",
      date: "2023-05-20",
      duration: "2.5 hours",
      totalStudents: 412,
      status: "Active",
      subjects: ["Physics", "Chemistry", "Mathematics", "Biology"],
    },
    {
      id: 3,
      name: "BITSAT",
      date: "2023-05-25",
      duration: "3 hours",
      totalStudents: 328,
      status: "Upcoming",
      subjects: ["Physics", "Chemistry", "Mathematics", "English"],
    },
    {
      id: 4,
      name: "MIT Entrance",
      date: "2023-05-10",
      duration: "2 hours",
      totalStudents: 256,
      status: "Completed",
      subjects: ["Physics", "Chemistry", "Mathematics"],
    },
    {
      id: 5,
      name: "NEET",
      date: "2023-06-01",
      duration: "3.5 hours",
      totalStudents: 621,
      status: "Upcoming",
      subjects: ["Physics", "Chemistry", "Biology"],
    },
  ]

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, you would add the exam to the database
    setShowAddModal(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Exam Management</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <PlusCircle className="inline w-4 h-4 mr-1" />
            Create Exam
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <Download className="inline w-4 h-4 mr-1" />
            Export
          </button>
        </div>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col mb-6 space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="relative">
          <Search className="absolute top-0 left-0 w-5 h-5 ml-3 text-gray-400 pointer-events-none transform translate-y-1/2" />
          <input
            type="text"
            placeholder="Search exams..."
            className="w-full py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-md md:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex space-x-2">
          <select className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Exams grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {exams.map((exam) => (
          <div key={exam.id} className="overflow-hidden bg-white rounded-lg shadow">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{exam.name}</h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    exam.status === "Completed"
                      ? "bg-green-100 text-green-800"
                      : exam.status === "Active"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {exam.status}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="flex-shrink-0 w-5 h-5 mr-1.5 text-gray-400" />
                  <span>Date: {exam.date}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="flex-shrink-0 w-5 h-5 mr-1.5 text-gray-400" />
                  <span>Duration: {exam.duration}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="flex-shrink-0 w-5 h-5 mr-1.5 text-gray-400" />
                  <span>Students: {exam.totalStudents}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <FileText className="flex-shrink-0 w-5 h-5 mr-1.5 text-gray-400" />
                  <span>Subjects: {exam.subjects.join(", ")}</span>
                </div>
              </div>
              <div className="flex justify-end mt-6 space-x-2">
                <button className="p-2 text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-yellow-600 bg-yellow-100 rounded-md hover:bg-yellow-200">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 text-red-600 bg-red-100 rounded-md hover:bg-red-200">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Exam Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Create New Exam</h3>
                    <div className="mt-4">
                      <form onSubmit={handleAddExam}>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                              Exam Name
                            </label>
                            <input
                              type="text"
                              name="name"
                              id="name"
                              className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                              Date
                            </label>
                            <input
                              type="date"
                              name="date"
                              id="date"
                              className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                              Duration
                            </label>
                            <select
                              id="duration"
                              name="duration"
                              className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              required
                            >
                              <option value="1 hour">1 hour</option>
                              <option value="1.5 hours">1.5 hours</option>
                              <option value="2 hours">2 hours</option>
                              <option value="2.5 hours">2.5 hours</option>
                              <option value="3 hours">3 hours</option>
                              <option value="3.5 hours">3.5 hours</option>
                              <option value="4 hours">4 hours</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label htmlFor="subjects" className="block text-sm font-medium text-gray-700">
                              Subjects
                            </label>
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center">
                                <input
                                  id="physics"
                                  name="subjects"
                                  type="checkbox"
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  value="Physics"
                                />
                                <label htmlFor="physics" className="block ml-2 text-sm text-gray-700">
                                  Physics
                                </label>
                              </div>
                              <div className="flex items-center">
                                <input
                                  id="chemistry"
                                  name="subjects"
                                  type="checkbox"
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  value="Chemistry"
                                />
                                <label htmlFor="chemistry" className="block ml-2 text-sm text-gray-700">
                                  Chemistry
                                </label>
                              </div>
                              <div className="flex items-center">
                                <input
                                  id="mathematics"
                                  name="subjects"
                                  type="checkbox"
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  value="Mathematics"
                                />
                                <label htmlFor="mathematics" className="block ml-2 text-sm text-gray-700">
                                  Mathematics
                                </label>
                              </div>
                              <div className="flex items-center">
                                <input
                                  id="biology"
                                  name="subjects"
                                  type="checkbox"
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  value="Biology"
                                />
                                <label htmlFor="biology" className="block ml-2 text-sm text-gray-700">
                                  Biology
                                </label>
                              </div>
                              <div className="flex items-center">
                                <input
                                  id="english"
                                  name="subjects"
                                  type="checkbox"
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  value="English"
                                />
                                <label htmlFor="english" className="block ml-2 text-sm text-gray-700">
                                  English
                                </label>
                              </div>
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                              Status
                            </label>
                            <select
                              id="status"
                              name="status"
                              className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              required
                            >
                              <option value="Upcoming">Upcoming</option>
                              <option value="Active">Active</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                          <button
                            type="submit"
                            className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                          >
                            Create Exam
                          </button>
                          <button
                            type="button"
                            className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                            onClick={() => setShowAddModal(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

