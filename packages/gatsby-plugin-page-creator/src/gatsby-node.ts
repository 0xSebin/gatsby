import globCB from "glob"
import Bluebird from "bluebird"
import _ from "lodash"
import systemPath from "path"
import { sync as existsSync } from "fs-exists-cached"
import {
  CreatePagesArgs,
  ParentSpanPluginArgs,
  SetFieldsOnGraphQLNodeTypeArgs,
  PluginOptions,
  PluginCallback,
} from "gatsby"
import { createPage } from "./create-page-wrapper"
import { createPath, watchDirectory } from "gatsby-page-utils"
import { collectionExtractQueryString } from "./collection-extract-query-string"
import { parse, GraphQLString } from "graphql"
import { derivePath } from "./derive-path"
import { validatePathQuery } from "./validate-path-query"

type GlobParameters = Parameters<typeof globCB>
const glob = Bluebird.promisify<
  Array<string>,
  GlobParameters[0],
  GlobParameters[1]
>(globCB)

interface IOptions extends PluginOptions {
  path: string
  pathCheck: boolean
  ignore: Array<string>
}

// Path creator.
// Auto-create pages.
// algorithm is glob /pages directory for js/jsx/cjsx files *not*
// underscored. Then create url w/ our path algorithm *unless* user
// takes control of that page component in gatsby-node.
async function createPagesStatefully(
  {
    store,
    actions,
    reporter,
    graphql,
  }: CreatePagesArgs & {
    traceId: "initial-createPages"
  },
  { path: pagesPath, pathCheck = true, ignore }: IOptions,
  doneCb: PluginCallback
): Promise<void> {
  const { deletePage } = actions
  const { program } = store.getState()

  const exts = program.extensions.map(e => `${e.slice(1)}`).join(`,`)

  if (!pagesPath) {
    reporter.panic(
      `
      "path" is a required option for gatsby-plugin-page-creator

      See docs here - https://www.gatsbyjs.org/plugins/gatsby-plugin-page-creator/
      `
    )
  }

  // Validate that the path exists.
  if (pathCheck && !existsSync(pagesPath)) {
    reporter.panic(
      `
      The path passed to gatsby-plugin-page-creator does not exist on your file system:

      ${pagesPath}

      Please pick a path to an existing directory.
      `
    )
  }

  const pagesDirectory = systemPath.resolve(process.cwd(), pagesPath)
  const pagesGlob = `**/*.{${exts}}`

  // Get initial list of files.
  let files = await glob(pagesGlob, { cwd: pagesPath })
  files.forEach(file => {
    createPage(file, pagesDirectory, actions, ignore, graphql)
  })

  watchDirectory(
    pagesPath,
    pagesGlob,
    addedPath => {
      if (!_.includes(files, addedPath)) {
        createPage(addedPath, pagesDirectory, actions, ignore, graphql)
        files.push(addedPath)
      }
    },
    removedPath => {
      // Delete the page for the now deleted component.
      const componentPath = systemPath.join(pagesDirectory, removedPath)
      store.getState().pages.forEach(page => {
        if (page.component === componentPath) {
          deletePage({
            path: createPath(removedPath),
            component: componentPath,
          })
        }
      })
      files = files.filter(f => f !== removedPath)
    }
  ).then(() => doneCb(null, null))
}

const knownCollections = new Map()

function setFieldsOnGraphQLNodeType({
  type,
  store,
}: SetFieldsOnGraphQLNodeTypeArgs): object {
  const extensions = store.getState().program.extensions
  const collectionQuery = `all${type.name}`
  if (knownCollections.has(collectionQuery)) {
    return {
      path: {
        type: GraphQLString,
        args: {
          filePath: {
            type: GraphQLString,
          },
        },
        resolve: (
          source: object,
          { filePath }: { filePath: string }
        ): string => {
          validatePathQuery(filePath, extensions)

          return derivePath(filePath, source)
        },
      },
    }
  }

  return {}
}

exports.createPagesStatefully = createPagesStatefully
exports.setFieldsOnGraphQLNodeType = setFieldsOnGraphQLNodeType

exports.onPreInit = async function onPreInit(
  _args: ParentSpanPluginArgs,
  { path: pagesPath }: IOptions
): Promise<void> {
  systemPath.resolve(process.cwd(), pagesPath)
  const pagesGlob = `**/\\{*\\}**`

  const files = await glob(pagesGlob, { cwd: pagesPath })

  await Bluebird.map(files, async relativePath => {
    const absolutePath = require.resolve(
      systemPath.join(pagesPath, relativePath)
    )
    const queryString = await collectionExtractQueryString(absolutePath)
    if (!queryString) return
    const ast = parse(queryString)
    knownCollections.set(
      // @ts-ignore
      ast.definitions[0].selectionSet.selections[0].name.value,
      relativePath
    )
  })
}
