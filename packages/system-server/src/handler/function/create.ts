/*
 * @Author: Maslow<wangfugen@126.com>
 * @Date: 2021-09-01 13:07:07
 * @LastEditTime: 2021-12-07 14:49:40
 * @Description: 
 */

import { ObjectId } from 'bson'
import { Request, Response } from 'express'
import { IApplicationData } from '../../support/application'
import { checkPermission } from '../../support/permission'
import { CN_FUNCTIONS } from '../../constants'
import { permissions } from '../../permissions'
import { DatabaseAgent } from '../../db'
import { hashFunctionCode } from '../../support/util-passwd'
import { compileTs2js } from '../../support/util-lang'

const { FUNCTION_ADD } = permissions

/**
 * Create function
 */
export async function handleCreateFunction(req: Request, res: Response) {
  const uid = req['auth']?.uid
  const db = DatabaseAgent.db
  const app: IApplicationData = req['parsed-app']

  // check permission
  const code = await checkPermission(uid, FUNCTION_ADD.name, app)
  if (code) {
    return res.status(code).send()
  }

  // check params
  const body = req.body
  if (!body.name) return res.status(422).send('name cannot be empty')
  if (!body.code) return res.status(422).send('code cannot be empty')
  if (!body.label) return res.status(422).send('label cannot be empty')
  //check label
  const labelPattern = /^[a-zA-Z0-9_\-]+$/
  if (!labelPattern.test(body.label)) return res.status(422).send('label 只能含字母、数字、下划线及中划线')

  // function name should be unique
  const total = await db.collection(CN_FUNCTIONS)
    .countDocuments({ name: body.name, appid: app.appid })

  if (total) return res.status(422).send('function name already exists')

  // build the func data
  const func = {
    name: body.name,
    code: body.code,
    description: body.description,
    enableHTTP: body.enableHTTP ?? false,
    status: body.status ?? 0,
    compiledCode: compileTs2js(body.code),
    tags: body.tags ?? [],
    triggers: [],
    label: body.label,
    version: 0,
    hash: hashFunctionCode(body.code),
    created_at: new Date(),
    updated_at: new Date(),
    created_by: new ObjectId(uid),
    appid: app.appid
  }

  // add cloud function
  const ret = await db.collection(CN_FUNCTIONS).insertOne(func)

  return res.send({ data: ret })
}