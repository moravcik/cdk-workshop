#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { IAMClient, GetUserCommand } from '@aws-sdk/client-iam';

import { CdkWorkshopStack } from './cdk-workshop-stack';

new IAMClient({}).send(new GetUserCommand({})).then(res => {
  const userName = res.User?.UserName || 'default';
  const app = new App();
  new CdkWorkshopStack(app, `cdk-workshop-${userName}`, { userName });
});
