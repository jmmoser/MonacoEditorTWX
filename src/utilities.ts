import * as monaco from './monaco-editor/esm/vs/editor/editor.api';
import { DISALLOWED_ENTITY_CHARS } from './constants';

declare const ThingworxInvoker: any;

/**
 *  Converts a nested json into a flat json. This is used for utilities reasons in order to present the configuration dialogue
 */
export function flattenJson(data) {
    var result = {};
    function recurse(cur, prop) {
        if (Object(cur) !== cur) {
            result[prop] = cur;
        } else if (Array.isArray(cur)) {
            for (var i = 0, l = cur.length; i < l; i++)
                recurse(cur[i], prop + "[" + i + "]");
            if (l == 0)
                result[prop] = [];
        } else {
            var isEmpty = true;
            for (var p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop + "." + p : p);
            }
            if (isEmpty && prop)
                result[prop] = {};
        }
    }
    recurse(data, "");
    return result;
};

/**
 *  Converts a flat json into a nested json. This is used for utilities reasons in order to present the configuration dialogue
 */
export function unflattenJson(data) {
    "use strict";
    if (Object(data) !== data || Array.isArray(data))
        return data;
    var regex = /\.?([^.\[\]]+)|\[(\d+)\]/g,
        resultholder = {};
    for (var p in data) {
        var cur = resultholder,
            prop = "",
            m;
        while (m = regex.exec(p)) {
            cur = cur[prop] || (cur[prop] = (m[2] ? [] : {}));
            prop = m[2] || m[1];
        }
        cur[prop] = data[p];
    }
    return resultholder[""] || resultholder;
};

/**
 * Gets the metadata of all the datashapes in the system. Uses an imported service on the MonacoEditorHelper thing
 */
export function getDataShapeDefinitions(): Promise<any> {
    var invokerSpec = {
        entityType: "Things",
        entityName: "MonacoEditorHelper",
        characteristic: "Services",
        target: "GetAllDataShapes",
        apiMethod: "post"
    };
    var invoker = new ThingworxInvoker(invokerSpec);
    return new Promise(function (c, e) {
        invoker.invokeService(
            function (invoker) {
                c(invoker.result.rows);
            },
            function (invoker, xhr) {
                e(invoker.result.rows);
            }
        );
    });
};

/**
 * Searches for entities in the platform using the spotlight search an returns a new promise with the metadata
 * @param  {string} entityType Thingworx Entity Type. 
 * @param  {string} searchTerm The entity to search for. Only the prefix can be specified.
 */
export function spotlightSearch(entityType, searchTerm): Promise<any[]> {
    var invokerSpec = {
        entityType: "Resources",
        entityName: "SearchFunctions",
        characteristic: "Services",
        target: "SpotlightSearch",
        apiMethod: "post",
        parameters: {
            searchExpression: searchTerm + "*",
            withPermissions: false,
            isAscending: false,
            maxItems: 500,
            types: {
                // todo: proper fix for MediaEntities -> MediaEntity
                items: [entityType == "MediaEntities" ? "MediaEntity" : entityType.slice(0, -1)]
            },
            sortBy: "lastModifiedDate",
            searchDescriptions: true
        }
    };
    var invoker = new ThingworxInvoker(invokerSpec);
    return new Promise(function (c, e) {
        invoker.invokeService(
            function (invoker) {
                c(invoker.result.rows);
            },
            function (invoker, xhr) {
                e("failed to search" + invoker.result.rows);
            }
        );
    });
};

/**
 * Loads a json monaco snippet file and returns a the Completion list
 *
 * @param  {string} snippets to load
 */
export function loadSnippets(snippets): monaco.languages.CompletionList {
    let result = {
        suggestions: []
    };
    for (let key in snippets) {
        if (snippets.hasOwnProperty(key)) {
            result.suggestions.push({
                kind: monaco.languages.CompletionItemKind.Snippet,
                label: snippets[key].prefix,
                documentation: snippets[key].description,
                insertText: {
                    value: snippets[key].body.join("\n")
                }
            });
        }
    }
    return result;
};

/**
 * Sanitizes an entity name to be a valid javascript declaration
 */
export function sanitizeEntityName(entityName: string): string {
    return entityName.replace(DISALLOWED_ENTITY_CHARS, "");
}

export function getScriptFunctionLibraries(): Promise<any> {
    return new Promise(function (resolve) {
        TW.IDE.getScriptFunctionLibraries(false, resolve);
    })
}
export function getResourcesMetadata(): Promise<any> {
    return new Promise(function (resolve) {
        TW.IDE.getResources(false, resolve);
    });
}

export function isGenericService(serviceName: string): boolean {
    return TW.IDE.isGenericServiceName(serviceName);
}

export function getEntityMetadata(entityType: string, entityName: string): Promise<any> {
    return new Promise(function(resolve) {
        resolve(TW.IDE.getEntityMetaData(entityType, entityName));
    });
}

export async function getThingPropertyValues(entityName: string): Promise<any> {
    const response = await fetch(`/Thingworx/Things/${TW.encodeEntityName(entityName)}/Properties?Accept=application%2Fjson&method=get`);
    return response.json();
}