"use client"

import type React from "react"

import { useState } from "react"
import { Search, PlusCircle, Download, Edit, Trash2, Upload, Filter, ChevronDown, FileText } from "lucide-react"

export default function AdminQuestions() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState("All")
  const [selectedDifficulty, setSelectedDifficulty] = useState("All")

  // Sample question data
  const questions = [
    {
      id: 1,
      text: "What is the SI unit of force?",
      subject: "Physics",
      difficulty: "Easy",
      options: ["Newton", "Joule", "Watt", "Pascal"],
      correctAnswer: "Newton",
      exam: "JEE Mains",
    },
    {
      id: 2,
      text: "Which of the following is a noble gas?",
      subject: "Chemistry",
      difficulty: "Easy",
      options: ["Oxygen", "Nitrogen", "Helium", "Hydrogen"],
      correctAnswer: "Helium",
      exam: "NEET",
    },
    {
      id: 3,
      text: "Solve the equation: 2x + 5 = 15",
      subject: "Mathematics",
      difficulty: "Easy",
      options: ["x = 5", "x = 10", "x = 7.5", "x = 5.5"],
      correctAnswer: "x = 5",
      exam: "BITSAT",
    },
    {
      id: 4,
      text: "What is the principle of conservation of energy?",
      subject: "Physics",
      difficulty: "Medium",
      options: [
        "Energy can be created but not destroyed",
        "Energy can be destroyed but not created",
        "Energy can neither be created nor destroyed, only transformed",
        "Energy can be both created and destroyed",
      ],
      correctAnswer: "Energy can neither be created nor destroyed, only transformed",
      exam: "JEE Mains",
    },
    {
      id: 5,
      text: "What is the pH of a neutral solution?",
      subject: "Chemistry",
      difficulty: "Easy",
      options: ["0", "7", "14", "1"],
      correctAnswer: "7",
      exam: "VITEEE",
    },
    {
      id: 6,
      text: "Find the derivative of f(x) = x² + 3x + 2",
      subject: "Mathematics",
      difficulty: "Medium",
      options: ["f'(x) = 2x + 3", "f'(x) = x² + 3", "f'(x) = 2x", "f'(x) = 3"],
      correctAnswer: "f'(x) = 2x + 3",
      exam: "MIT Entrance",
    },
    {
      id: 7,
      text: "Which organelle is known as the powerhouse of the cell?",
      subject: "Biology",
      difficulty: "Easy",
      options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"],
      correctAnswer: "Mitochondria",
      exam: "NEET",
    },
    {
      id: 8,
      text: 'What is the correct form of the verb in the sentence: "She ___ to the store yesterday."',
      subject: "English",
      difficulty: "Easy",
      options: ["go", "goes", "went", "gone"],
      correctAnswer: "went",
      exam: "BITSAT",
    },
  ]

  const filteredQuestions = questions.filter(
    (q) =>
      (selectedSubject === "All" || q.subject === selectedSubject) &&
      (selectedDifficulty === "All" || q.difficulty === selectedDifficulty),
  )

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, you would add the question to the database
    setShowAddModal(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Question Bank</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <PlusCircle className="inline w-4 h-4 mr-1" />
            Add Question
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <Upload className="inline w-4 h-4 mr-1" />
            Import
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
            placeholder="Search questions..."
            className="w-full py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-md md:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex space-x-2">
          <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <Filter className="w-4 h-4 mr-2" />
            Filter
            <ChevronDown className="w-4 h-4 ml-1" />
          </button>
          <select
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="All">All Subjects</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Biology">Biology</option>
            <option value="English">English</option>
          </select>
          <select
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
          >
            <option value="All">All Difficulty</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Questions table */}
      <div className="overflow-hidden bg-white shadow sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  Question
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  Subject
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  Difficulty
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                >
                  Exam
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
              {filteredQuestions.map((question) => (
                <tr key={question.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-normal">
                    <div className="text-sm text-gray-900">{question.text}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      <span className="font-medium">Correct Answer:</span> {question.correctAnswer}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{question.subject}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                        question.difficulty === "Easy"
                          ? "bg-green-100 text-green-800"
                          : question.difficulty === "Medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {question.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{question.exam}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                    <div className="flex justify-end space-x-2">
                      <button className="p-1 text-yellow-600 rounded hover:bg-yellow-100" title="Edit Question">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-red-600 rounded hover:bg-red-100" title="Delete Question">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-3 bg-white border-t">
          <div className="flex items-center">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to{" "}
              <span className="font-medium">{filteredQuestions.length}</span> of{" "}
              <span className="font-medium">{filteredQuestions.length}</span> results
            </p>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Previous
            </button>
            <button className="px-3 py-1 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700">
              1
            </button>
            <button className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Question Modal */}
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
                  <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-blue-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Add New Question</h3>
                    <div className="mt-4">
                      <form onSubmit={handleAddQuestion}>
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="question" className="block text-sm font-medium text-gray-700">
                              Question Text
                            </label>
                            <textarea
                              id="question"
                              name="question"
                              rows={3}
                              className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="Enter your question here"
                              required
                            ></textarea>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                                Subject
                              </label>
                              <select
                                id="subject"
                                name="subject"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                required
                              >
                                <option value="">Select Subject</option>
                                <option value="Physics">Physics</option>
                                <option value="Chemistry">Chemistry</option>
                                <option value="Mathematics">Mathematics</option>
                                <option value="Biology">Biology</option>
                                <option value="English">English</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
                                Difficulty
                              </label>
                              <select
                                id="difficulty"
                                name="difficulty"
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                required
                              >
                                <option value="">Select Difficulty</option>
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="exam" className="block text-sm font-medium text-gray-700">
                              Exam
                            </label>
                            <select
                              id="exam"
                              name="exam"
                              className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              required
                            >
                              <option value="">Select Exam</option>
                              <option value="JEE Mains">JEE Mains</option>
                              <option value="NEET">NEET</option>
                              <option value="BITSAT">BITSAT</option>
                              <option value="VITEEE">VITEEE</option>
                              <option value="MIT Entrance">MIT Entrance</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">Options</label>
                            <div className="mt-2 space-y-2">
                              {[1, 2, 3, 4].map((num) => (
                                <div key={num} className="flex items-center">
                                  <input
                                    type="radio"
                                    id={`correct-${num}`}
                                    name="correct"
                                    value={num}
                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                  />
                                  <input
                                    type="text"
                                    id={`option-${num}`}
                                    name={`option-${num}`}
                                    placeholder={`Option ${num}`}
                                    className="block w-full ml-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    required
                                  />
                                </div>
                              ))}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              Select the radio button for the correct answer.
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                          <button
                            type="submit"
                            className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                          >
                            Add Question
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

