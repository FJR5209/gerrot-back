declare module 'typeorm' {
  // Decorators
  export function Entity(name?: string): ClassDecorator;
  export function PrimaryGeneratedColumn(strategy?: string): PropertyDecorator;
  export function PrimaryColumn(options?: any): PropertyDecorator;
  export function ObjectIdColumn(): PropertyDecorator;
  export function Column(options?: any): PropertyDecorator;
  export function OneToMany(
    typeFunction: (...args: any[]) => any,
    inverseSide: (object: any) => any,
    options?: any
  ): PropertyDecorator;
  export function ManyToOne(
    typeFunction: (...args: any[]) => any,
    inverseSide: (object: any) => any,
    options?: any
  ): PropertyDecorator;
  export function CreateDateColumn(options?: any): PropertyDecorator;
  export function UpdateDateColumn(options?: any): PropertyDecorator;
}
