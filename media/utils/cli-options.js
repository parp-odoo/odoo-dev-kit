export const cliOptions = [
	{
		groupName: "Server",
		description: "Run the Odoo server",
		options: [
			{
				key: "-d",
				name: "database",
				type: "text",
				description: "Database(s) used when installing or updating modules.",
			},
			{
				key: "-i",
				name: "init",
				type: "list",
				description: "Modules to install before running the server.",
			},
			{
				key: "-u",
				name: "update",
				type: "list",
				description: "Modules to update before running the server.",
			},
			{
				key: "--reinit",
				name: "reinit",
				type: "list",
				description: "Modules to reinitialize before starting the server.",
			},
			{
				key: "-D",
				name: "data-dir",
				type: "text",
				description: "Directory where Odoo stores data.",
			},
			{ key: "-c", name: "config", type: "text", description: "Path to configuration file." },
			{
				key: "-s",
				name: "save",
				type: "boolean",
				description: "Save server configuration to config file.",
			},
			{
				key: "--stop-after-init",
				name: "stop-after-init",
				type: "boolean",
				description: "Stop server after initialization.",
			},
			{
				key: "--pidfile",
				name: "pidfile",
				type: "text",
				description: "Path to file where server PID is stored.",
			},
		],
	},

	{
		groupName: "Developer",
		description: "Developer features",
		options: [
			{
				key: "--dev",
				name: "dev",
				type: "list",
				description: "Enable developer features (xml,reload,qweb,...).",
			},
			{ key: "-p", name: "http-port", type: "number", description: "HTTP port." },
			{
				key: "--proxy-mode",
				name: "proxy-mode",
				type: "boolean",
				description: "Enable proxy mode.",
			},
			{
				key: "--limit-time-real",
				name: "limit-time-real",
				type: "number",
				description: "Real time limit per request.",
			},
		],
	},

	{
		groupName: "Database",
		description: "Database configuration",
		options: [
			{
				key: "--db-filter",
				name: "db-filter",
				type: "text",
				description: "Regex filter limiting database visibility.",
			},
			{
				key: "--db-template",
				name: "db-template",
				type: "text",
				description: "Template used when creating new databases.",
			},
			{
				key: "--db_sslmode",
				name: "db_sslmode",
				type: "text",
				description: "PostgreSQL SSL mode.",
			},
			{
				key: "--no-database-list",
				name: "no-database-list",
				type: "boolean",
				description: "Disable listing of databases.",
			},
			{
				key: "--pg_path",
				name: "pg_path",
				type: "text",
				description: "Path to PostgreSQL binaries.",
			},
		],
	},

	{
		groupName: "Demo Data",
		description: "Demo data configuration",
		options: [
			{
				key: "--with-demo",
				name: "with-demo",
				type: "boolean",
				description: "Install demo data in new databases.",
			},
			{
				key: "--without-demo",
				name: "without-demo",
				type: "boolean",
				description: "Disable demo data installation.",
			},
			{
				key: "--skip-auto-install",
				name: "skip-auto-install",
				type: "boolean",
				description: "Skip auto-installing modules.",
			},
		],
	},

	{
		groupName: "HTTP",
		description: "HTTP server configuration",
		options: [
			{
				key: "--no-http",
				name: "no-http",
				type: "boolean",
				description: "Disable HTTP server.",
			},
			{
				key: "--http-interface",
				name: "http-interface",
				type: "text",
				description: "HTTP interface address.",
			},
			// { key: "-p", name: "http-port", type: "number", description: "HTTP port." },
			{
				key: "--proxy-mode",
				name: "proxy-mode",
				type: "boolean",
				description: "Enable proxy mode.",
			},
			{
				key: "--x-sendfile",
				name: "x-sendfile",
				type: "boolean",
				description: "Use X-Sendfile header.",
			},
		],
	},
	{
		groupName: "Multiprocessing",
		description: "Workers and performance tuning",
		options: [
			{
				key: "--workers",
				name: "workers",
				type: "number",
				description: "Number of HTTP workers.",
			},
			{
				key: "--limit-request",
				name: "limit-request",
				type: "number",
				description: "Maximum requests per worker.",
			},
			{
				key: "--limit-memory-soft",
				name: "limit-memory-soft",
				type: "number",
				description: "Soft memory limit per worker.",
			},
			{
				key: "--limit-memory-hard",
				name: "limit-memory-hard",
				type: "number",
				description: "Hard memory limit per worker.",
			},
			{
				key: "--limit-time-cpu",
				name: "limit-time-cpu",
				type: "number",
				description: "CPU time limit per request.",
			},
			// { key: "--limit-time-real", name: "limit-time-real", type: "number", description: "Real time limit per request." },
			{
				key: "--max-cron-threads",
				name: "max-cron-threads",
				type: "number",
				description: "Number of cron threads.",
			},
			{
				key: "--limit-time-worker-cron",
				name: "limit-time-worker-cron",
				type: "number",
				description: "Cron worker time limit.",
			},
		],
	},
];
