import { type NextRequest, NextResponse } from "next/server"

// Mock student database for face recognition
const mockStudentDatabase = [
  { id: "STU001", name: "John Doe", rollNo: "CS2021001" },
  { id: "STU002", name: "Jane Smith", rollNo: "CS2021002" },
  { id: "STU003", name: "Mike Johnson", rollNo: "MATH2022001" },
  { id: "STU004", name: "Sarah Wilson", rollNo: "PHY2021001" },
  { id: "STU005", name: "David Brown", rollNo: "CS2021003" },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { timestamp, frameNumber } = body

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Simulate face detection with random results
    const shouldDetectFaces = Math.random() > 0.4 // 60% chance of detecting faces
    const detectedFaces = []

    if (shouldDetectFaces) {
      // Randomly select 1-3 students
      const numFaces = Math.floor(Math.random() * 3) + 1
      const selectedStudents = mockStudentDatabase.sort(() => 0.5 - Math.random()).slice(0, numFaces)

      for (const student of selectedStudents) {
        detectedFaces.push({
          id: student.id,
          name: student.name,
          rollNo: student.rollNo,
          confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
          timestamp: new Date().toISOString(),
          location: {
            x: Math.random() * 100,
            y: Math.random() * 100,
            width: 50 + Math.random() * 50,
            height: 50 + Math.random() * 50,
          },
        })
      }
    }

    // Log attendance for detected faces
    if (detectedFaces.length > 0) {
      console.log(`[${timestamp}] Frame ${frameNumber}: Detected ${detectedFaces.length} faces`)
      detectedFaces.forEach((face) => {
        console.log(`  - ${face.name} (${face.rollNo}) - ${(face.confidence * 100).toFixed(1)}% confidence`)
      })
    }

    return NextResponse.json({
      success: true,
      timestamp,
      frameNumber,
      faces: detectedFaces,
      processingTime: "500ms",
      message: detectedFaces.length > 0 ? `Detected ${detectedFaces.length} face(s)` : "No faces detected",
    })
  } catch (error) {
    console.error("Error in verify endpoint:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process frame",
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}
