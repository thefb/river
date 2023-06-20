import { Auditable } from "./Auditable";

export abstract class BaseDef extends Auditable {
    private accessPolicy: Map<Permission, string> = new Map<Permission, string>();
  
    addPermission(permission: Permission, allowedAuthority: string): void {
      this.accessPolicy.set(permission, allowedAuthority);
    }
  
    addPermissionIfAbsent(permission: Permission, allowedAuthority: string): void {
      if (!this.accessPolicy.has(permission)) {
        this.accessPolicy.set(permission, allowedAuthority);
      }
    }
  
    removePermission(permission: Permission): void {
      this.accessPolicy.delete(permission);
    }
  
    getAllowedAuthority(permission: Permission): string | undefined {
      return this.accessPolicy.get(permission);
    }
  
    clearAccessPolicy(): void {
      this.accessPolicy.clear();
    }
  
    getAccessPolicy(): ReadonlyMap<Permission, string> {
      return new Map(this.accessPolicy);
    }
  
    setAccessPolicy(accessPolicy: ReadonlyMap<Permission, string>): void {
      this.accessPolicy.clear();
      accessPolicy.forEach((allowedAuthority, permission) => {
        this.accessPolicy.set(permission, allowedAuthority);
      });
    }
  }