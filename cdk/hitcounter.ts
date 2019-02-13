import { Construct } from '@aws-cdk/cdk';
import { Code, IFunction, Function, Runtime } from '@aws-cdk/aws-lambda';
import { Table, AttributeType } from '@aws-cdk/aws-dynamodb';

export interface HitCounterProps {
  // the function for which we want to count url hits
  downstream: IFunction;
}

export class HitCounter extends Construct {

  // allows accessing the counter function
  public readonly handler: Function;

  // the hit counter table
  public readonly table: Table;

  constructor(scope: Construct, id: string, props: HitCounterProps) {
    super(scope, id);  

    this.table = new Table(this, 'Hits');
    this.table.addPartitionKey({ name: 'path', type: AttributeType.String});

    this.handler = new Function(this, 'HitCounterHandler', {
      runtime: Runtime.NodeJS810,
      handler: 'hitcounter.handler',
      code: Code.asset('dist/lambda'),
      environment: {
        DOWNSTREAM_FUNCTION_NAME: props.downstream.functionName,
        HITS_TABLE_NAME: this.table.tableName
      }
    });

    // grant the lambda role read/write permissions to our table
    this.table.grantReadWriteData(this.handler.role);

    // grant the lambda role invoke permissions to the downstream function
    props.downstream.grantInvoke(this.handler.role);
  }  
}
