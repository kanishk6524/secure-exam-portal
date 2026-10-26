import { PrismaClient } from "@prisma/client"
import { STATIC_PACKS, liveDemoPack, placementPack } from "./exam-packs"
import { installPack } from "./install-pack"

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  if (args[0] === "--demo") {
    // A fresh demo exam every run, so the same student account can take it again: npm run exam:demo -- 1
    const minutes = Math.min(30, Math.max(1, Math.round(Number(args[1]) || 2)))
    await installPack(prisma, liveDemoPack(`demo-${Date.now()}`, minutes))
    console.log(`Created "Live Demo Exam (${minutes} minute${minutes === 1 ? "" : "s"})". Refresh the exam list to see it.`)
    return
  }
  const companyArg = args.join(" ").trim()
  if (companyArg) {
    const slug = companyArg.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    await installPack(prisma, placementPack(companyArg, `placement-${slug}`))
    console.log(`Placement drive created for "${companyArg}".`)
    return
  }
  for (const pack of STATIC_PACKS) {
    await installPack(prisma, pack)
    console.log(`Installed: ${pack.title} (${pack.subjects.reduce((sum, subject) => sum + subject.questions.length, 0)} questions, ${pack.durationMins} min)`)
  }
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1) })
