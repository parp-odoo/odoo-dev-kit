import * as vscode from "vscode";

/**
 * Central registry of service constructors. All services must be registered here
 * via {@link addService} before calling {@link initServices}.
 */
const serviceRegistry: ServiceRegistry = {};

export type ServiceRegistry = {
	[key: string]: any;
};

/** Registers a service constructor under the given name. */
export function addService<T>(name: string, service: T) {
	serviceRegistry[name] = service;
}

const serviceInstances: ServiceRegistry = {};

/**
 * Retrieves a service instance by name. Call this after {@link initServices}
 * to get a fully constructed instance.
 */
export function getService<T>(name: string): T {
	return serviceInstances[name] as T;
}

/**
 * Instantiates all registered services with the given context and webview.
 * Should be called once during extension activation.
 */
export function initServices(ctx: vscode.ExtensionContext, webview: vscode.Webview) {
	for (const [serviceName, serviceClass] of Object.entries(serviceRegistry)) {
		const serviceInstance = new serviceClass(ctx, webview);
		serviceInstances[serviceName] = serviceInstance;
	}
	return serviceInstances;
}


export function getHandlers() {
	const hanlders = {};
	for (const service of Object.values(serviceInstances)) {
		Object.assign(hanlders, service.handlers);
	}
	return hanlders;
}
