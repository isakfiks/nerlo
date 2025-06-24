"use client"
import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { Plus, X, ArrowRight, ArrowLeft } from "lucide-react"

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Form data-
  const [familyData, setFamilyData] = useState({
    familyName: "",
    parentPin: "",
    confirmPin: ""
  })
  
  const [kids, setKids] = useState([
    { name: "", age: "" }
  ])

  const supabase = createClientComponentClient()
  const router = useRouter()

  const addKid = () => {
    setKids([...kids, { name: "", age: "" }])
  }

  const removeKid = (index) => {
    if (kids.length > 1) {
      setKids(kids.filter((_, i) => i !== index))
    }
  }

  const updateKid = (index, field, value) => {
    const updatedKids = kids.map((kid, i) => 
      i === index ? { ...kid, [field]: value } : kid
    )
    setKids(updatedKids)
  }

  const validateStep1 = () => {
    if (!familyData.familyName.trim()) {
      setError("Please enter a family name")
      return false
    }
    if (!familyData.parentPin || familyData.parentPin.length < 4) {
      setError("Parent PIN must be at least 4 digits")
      return false
    }
    if (familyData.parentPin !== familyData.confirmPin) {
      setError("PINs don't match")
      return false
    }
    setError("")
    return true
  }

  const validateStep2 = () => {
    const validKids = kids.filter(kid => kid.name.trim())
    if (validKids.length === 0) {
      setError("Please add at least one child")
      return false
    }
    for (let kid of validKids) {
      if (!kid.age || kid.age < 3 || kid.age > 18) {
        setError("Please enter valid ages (3-18) for all children")
        return false
      }
    }
    setError("")
    return true
  }

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError("")
    }
  }

  const handleComplete = async () => {
    if (!validateStep2()) return
    
    setLoading(true)
    setError("")

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Create family
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({
          parent_id: user.id,
          family_name: familyData.familyName,
          parent_pin: familyData.parentPin
        })
        .select()
        .single()

      if (familyError) throw familyError

      // Create kids
      const validKids = kids.filter(kid => kid.name.trim())
      const kidsData = validKids.map(kid => ({
        family_id: family.id,
        name: kid.name.trim(),
        age: parseInt(kid.age)
      }))

      const { error: kidsError } = await supabase
        .from('kids')
        .insert(kidsData)

      if (kidsError) throw kidsError

      // Create some sample tasks
      const sampleTasks = [
        {
          family_id: family.id,
          assigned_to: null, // Will be assigned later by parent
          title: "Take out trash",
          description: "Empty all trash cans and take to curb",
          category: "Chores",
          reward: 3.00,
          difficulty: "Easy",
          time_estimate: "5 min",
          deadline: "Weekly",
          urgent: false
        },
        {
          family_id: family.id,
          assigned_to: null,
          title: "Load dishwasher",
          description: "Load and start the dishwasher after dinner",
          category: "Chores",
          reward: 2.50,
          difficulty: "Easy",
          time_estimate: "10 min",
          deadline: "Daily",
          urgent: false
        }
      ]

      await supabase.from('tasks').insert(sampleTasks)

      // Redirect to dashboard
      router.push('/')
      
    } catch (error) {
      console.error('Onboarding error:', error)
      setError(error.message || "Failed to set up family. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium text-gray-900">Welcome to Nerlo</h1>
          <p className="mt-2 text-sm text-gray-600">Let's get your family set up</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 1 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <div className={`w-12 h-1 mx-2 ${
              currentStep >= 2 ? 'bg-gray-900' : 'bg-gray-200'
            }`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 2 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <div className={`w-12 h-1 mx-2 ${
              currentStep >= 3 ? 'bg-gray-900' : 'bg-gray-200'
            }`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 3 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              3
            </div>
          </div>
        </div>

        <div className="bg-white py-8 px-6 shadow-sm rounded-lg border border-gray-100">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Step 1: Family Setup */}
          {currentStep === 1 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Family Setup</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Family Name
                  </label>
                  <input
                    type="text"
                    value={familyData.familyName}
                    onChange={(e) => setFamilyData({...familyData, familyName: e.target.value})}
                    className="placeholder-gray-400 text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Our Family"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent PIN
                  </label>
                  <input
                    type="password"
                    value={familyData.parentPin}
                    onChange={(e) => setFamilyData({...familyData, parentPin: e.target.value})}
                    className="placeholder-gray-400 text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Create a 4-6 digit PIN"
                    maxLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This PIN will be used to access parent controls
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm PIN
                  </label>
                  <input
                    type="password"
                    value={familyData.confirmPin}
                    onChange={(e) => setFamilyData({...familyData, confirmPin: e.target.value})}
                    className="placeholder-gray-400 text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Confirm your PIN"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Add Kids */}
          {currentStep === 2 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Add Your Children</h3>
              
              <div className="space-y-4">
                {kids.map((kid, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={kid.name}
                        onChange={(e) => updateKid(index, 'name', e.target.value)}
                        className="placeholder-gray-400 text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="Child's name"
                      />
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        value={kid.age}
                        onChange={(e) => updateKid(index, 'age', e.target.value)}
                        className="placeholder-gray-400 text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="Age"
                        min="3"
                        max="18"
                      />
                    </div>
                    {kids.length > 1 && (
                      <button
                        onClick={() => removeKid(index)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={addKid}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add another child
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">Review & Complete</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Family Name</h4>
                  <p className="text-gray-900">{familyData.familyName}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700">Parent PIN</h4>
                  <p className="text-gray-900">{"*".repeat(familyData.parentPin.length)}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Children</h4>
                  <div className="space-y-2">
                    {kids.filter(kid => kid.name.trim()).map((kid, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 font-medium">{kid.name}</span>
                        <span className="text-sm text-gray-600">{kid.age} years old</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">What's next?</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• We'll create your family dashboard</li>
                    <li>• Add some sample tasks to get started</li>
                    <li>• Your kids can start earning right away!</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-8">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            
            <div className="flex-1" />
            
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Setting up..." : "Complete Setup"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
