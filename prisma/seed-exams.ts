import { PrismaClient } from "@prisma/client"
import { STATIC_PACKS, placementPack } from "./exam-packs"
import { installPack } from "./install-pack"

const prisma = new PrismaClient()

async function main() {
  const companyArg = process.argv.slice(2).join(" ").trim()
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
