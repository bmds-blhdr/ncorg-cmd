#!/usr/bin/env node
const Promise = require("bluebird")
const fs = Promise.promisifyAll(require("fs"))
const path = require("path")
const assert = require("assert")

const glob = Promise.promisify(require("glob"))
const NeoCities = require("neocities")

Promise.promisifyAll(NeoCities.prototype, {
	promisifier: method => {
		// neocities-node doesn't follow node's convention for callbacks,
		// therefore we have to modify the default behavior of promisifyAll.
		async function asyncMethod(...args) {
			const self = this
			let data
			data = await new Promise(resolve => method.call(self, ...args, resolve))
			if (data.result !== "success") {
				console.error(data)
				throw new Error("Error interacting with neocities' API.")
			} else {
				return data
			}
		}
		return asyncMethod
	}
})

const help = "NCORG-CMD\n\n" +
	"\t- help: print this help\n" +
	"\t- status: information about your website\n" +
	"\t- list: list all remote files\n" +
	"\t- push: synchronize your website with the folder given as an agument\n"

class NCOrgCmd {

	constructor(config) {
		const {username, password} = config
		this.config = {username, password}
	}

	_finalize_conf() {
		if ("neocities" in this)
			return

		const {username, password} = this.config
		this.neocities = new NeoCities(username, password)
	}

	async process_cmd(cmd, args) {
		// There is no need to have a working configuration if
		// all we need to do is print help.
		if (cmd !== "help")
			this._finalize_conf()

		switch (cmd) {
			case "list":
				const files = await this.list()
				for (const file of files)
					console.log(file)
				break
			case "push":
				await this.push(args)
				break
			case "status":
				await this.status()
				break
			case undefined:
				console.log("You must pass a command.\n")
			case "help":
				console.log(help)
				break
			default:
				console.error(`Unrecognized "${cmd}" command.`)
				console.log(help)
		}
	}

	async list() {
		const data = await this.neocities.getAsync("list", null)
		const files = data.files

		for (const file of files) {
			if (file.is_directory)
				file.path += "/"
		}

		return files.map(obj => obj.path)
	}

	async push(dir) {
		if (typeof dir === "undefined")
			throw new Error("You must pass a directory to be synchronized.")

		dir = dir.replace(/\/$/, "")
		const dir_stat = await fs.statAsync(dir)
		if (!dir_stat.isDirectory)
			throw new Error(`'${dir}' isn't a folder.`)

		// We immediatly start retrieving the list of remote files
		// as it doesn't depend on local files.
		const get_remotes = this.list()

		const paths = await glob(`${dir}/**/*`, {mark: true})
		const files = paths.filter(fpath => !fpath.endsWith("/"))

		function relative(fpath) {
			const relative = path.relative(dir, fpath)
			return fpath.endsWith("/") ? relative + "/" : relative
		}

		const args = files.map(fpath => {
			return {name: relative(fpath), path: fpath}
		})
		const upload = this.neocities.uploadAsync(args)

		const relative_paths = paths.map(relative)
		const remotes = await get_remotes
		const diff = remotes.filter(fpath => !relative_paths.includes(fpath))

		if (diff.length)
			await Promise.all([this.neocities.deleteAsync(diff), upload])
		else
			await upload
	}

	async status() {
		const info = await this.neocities.infoAsync()
		for (const key in info.info)
			console.log("%s: %s", key, info.info[key])
	}

}

module.exports = NCOrgCmd

if (require.main === module) {
	const config = {
		username: process.env.NEOCITIES_USER,
		password: process.env.NEOCITIES_PASS,
	}
	const nc_cmd = new NCOrgCmd(config)
	const running = nc_cmd.process_cmd(process.argv[2], process.argv[3])
	running.catch(err => {
		console.error(err)
		process.exit(1)
	})
}
