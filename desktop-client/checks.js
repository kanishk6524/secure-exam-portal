"use strict"
// Environment checks for the Secure Exam Client. Everything here is best-effort: a determined cheater controls
// their own machine, so these checks raise the effort and leave an audit trail (they are reported as incidents).
const { execFile } = require("child_process")
const fs = require("fs")
const os = require("os")
const { screen } = require("electron")

const VM_PATTERN = /(vmware|virtualbox|vbox|qemu|kvm|hyper-v|microsoft corporation virtual|parallels|xen|bochs|virtual machine|bhyve)/i

function run(command, args, timeout = 6000) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout, windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (error, stdout) => resolve(error ? "" : String(stdout)))
  })
}

async function listProcesses() {
  if (process.platform === "win32") {
    const out = await run("tasklist", ["/fo", "csv", "/nh"])
    return out.split(/\r?\n/).map((line) => (line.match(/^"([^"]+)"/) || [])[1]).filter(Boolean).map((name) => name.toLowerCase().replace(/\.exe$/, ""))
  }
  const out = await run("ps", ["-A", "-o", "comm="])
  return out.split("\n").map((line) => line.trim().split("/").pop().toLowerCase()).filter(Boolean)
}

function blockedProcesses(running, blocked) {
  const found = new Set()
  for (const name of running) {
    for (const token of blocked) {
      // Short tokens must match the whole program name (so "obs" does not match "observer"); long ones may be a prefix.
      if (name === token || (token.length >= 6 && name.startsWith(token))) found.add(token)
    }
  }
  return [...found]
}

async function detectVirtualMachine() {
  const hints = [os.cpus()[0] && os.cpus()[0].model]
  if (process.platform === "win32") {
    hints.push(await run("powershell", ["-NoProfile", "-Command", "(Get-CimInstance Win32_ComputerSystem | Select-Object -ExpandProperty Manufacturer) + ' ' + (Get-CimInstance Win32_ComputerSystem | Select-Object -ExpandProperty Model)"]))
  } else if (process.platform === "darwin") {
    const vmm = (await run("sysctl", ["-n", "kern.hv_vmm_present"])).trim()
    if (vmm === "1") return "macOS reports it is running under a hypervisor"
    hints.push(await run("sysctl", ["-n", "hw.model"]))
  } else {
    for (const file of ["/sys/class/dmi/id/product_name", "/sys/class/dmi/id/sys_vendor"]) {
      try { hints.push(fs.readFileSync(file, "utf8")) } catch { /* not readable */ }
    }
    const virt = (await run("systemd-detect-virt", [])).trim()
    if (virt && virt !== "none") return `systemd-detect-virt: ${virt}`
  }
  const text = hints.filter(Boolean).join(" ")
  return VM_PATTERN.test(text) ? text.trim().slice(0, 120) : ""
}

/** Runs all checks. `blocking` issues stop the exam from starting; during the exam every issue is reported. */
async function runChecks(config) {
  const issues = []
  const displays = screen.getAllDisplays()
  if (displays.length > 1) issues.push({ id: "MULTIPLE_MONITORS", blocking: true, label: "More than one display detected", detail: `${displays.length} displays connected. Disconnect the extra monitor(s).` })

  const running = await listProcesses()
  const apps = blockedProcesses(running, (config.blockedProcesses || []).map((name) => name.toLowerCase()))
  if (apps.length) issues.push({ id: "BLOCKED_APP", blocking: true, label: "Prohibited applications are running", detail: `Close: ${apps.join(", ")}`, apps })

  const vm = await detectVirtualMachine()
  if (vm) issues.push({ id: "VIRTUAL_MACHINE", blocking: true, label: "Virtual machine detected", detail: vm })

  return { ok: issues.every((issue) => !issue.blocking), issues, info: { platform: process.platform, displays: displays.length } }
}

module.exports = { runChecks }
