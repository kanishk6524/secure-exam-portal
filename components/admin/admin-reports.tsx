"use client"

import { useState } from "react"
import { Download, FileText, BarChart3, PieChart, Calendar } from "lucide-react"

export default function AdminReports() {
  const [selectedExam, setSelectedExam] = useState("All")
  const [selectedDate, setSelectedDate] = useState("Last 30 days")

  // Sample report data
  const reports = [
    {
      id: 1,
      name: "JEE Mains Performance Report",
      exam: "JEE Mains",
      date: "2023-05-16",
      type: "Performance",
      format: "PDF",
    },
    {
      id: 2,
      name: "VITEEE Student Analysis",
      exam: "VITEEE",
      date: "2023-05-21",
      type: "Analysis",
      format: "Excel",
    },
    {
      id: 3,
      name: "BITSAT Question Difficulty Analysis",
      exam: "BITSAT",
      date: "2023-04-10",
      type: "Question Analysis",
      format: "PDF",
    },
    {
      id: 4,
      name: "MIT Entrance Exam Results",
      exam: "MIT Entrance",
      date: "2023-05-12",
      type: "Results",
      format: "Excel",
    },
    {
      id: 5,
      name: "JEE Mains Subject-wise Performance",
      exam: "JEE Mains",
      date: "2023-05-17",
      type: "Subject Analysis",
      format: "PDF",
    },
  ]

  const filteredReports = reports.filter((report) => selectedExam === "All" || report.exam === selectedExam)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
        <div className="flex space-x-2">
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <BarChart3 className="inline w-4 h-4 mr-1" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="p-6 mb-8 bg-white rounded-lg shadow">
        <div className="flex flex-col mb-6 space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
          <h2 className="text-lg font-semibold text-gray-700">Analytics Dashboard</h2>
          <div className="flex space-x-2">
            <select
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
            >
              <option value="All">All Exams</option>
              <option value="JEE Mains">JEE Mains</option>
              <option value="VITEEE">VITEEE</option>
              <option value="BITSAT">BITSAT</option>
              <option value="MIT Entrance">MIT Entrance</option>
              <option value="NEET">NEET</option>
            </select>
            <select
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 30 days">Last 30 days</option>
              <option value="Last 3 months">Last 3 months</option>
              <option value="Last 6 months">Last 6 months</option>
              <option value="Last year">Last year</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 mb-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500 rounded-full">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Exams</h3>
                <p className="text-2xl font-semibold text-gray-900">24</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <div className="p-3 bg-green-500 rounded-full">
                <PieChart className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Average Score</h3>
                <p className="text-2xl font-semibold text-gray-900">72.5%</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-500 rounded-full">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Pass Rate</h3>
                <p className="text-2xl font-semibold text-gray-900">68.3%</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center">
              <div className="p-3 bg-purple-500 rounded-full">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Students</h3>
                <p className="text-2xl font-semibold text-gray-900">2,543</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="mb-4 text-md font-medium text-gray-700">Performance by Subject</h3>
            <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
              <p className="text-gray-500">Bar Chart Visualization</p>
              {/* In a real app, you would use a charting library like Chart.js or Recharts */}
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="mb-4 text-md font-medium text-gray-700">Score Distribution</h3>
            <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
              <p className="text-gray-500">Histogram Visualization</p>
              {/* In a real app, you would use a charting library like Chart.js or Recharts */}
            </div>
          </div>
        </div>
      </div>

      {/* Generated Reports */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-700">Generated Reports</h2>
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Report Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Exam
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Format
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <FileText className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{report.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.exam}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.date}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                          report.format === "PDF" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {report.format}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Download className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

