// Older custody/lifecycle cases isolate their original operation exchange.
// Supply the new independent connection read; connection routing/failure cases
// exercise that exchange explicitly in repository-connections.test.mjs.
export function withRepositoryConnections(fetchImpl, env, account) {
  return async (url, init) => {
    if (String(url).endsWith('/v1/repository-custody/connections')) {
      const bindings = Object.fromEntries([
        ['metadata','REPOSITORY_CUSTODY'], ['provisioning','REPOSITORY_PROVISIONING'], ['lifecycle','REPOSITORY_LIFECYCLE_PROVIDER'],
      ].map(([role,prefix])=>[role,{uri:env[`${prefix}_CREDENTIAL_BINDING_URI`]??'https://platform.example/binding',
        digest:env[`${prefix}_CREDENTIAL_BINDING_DIGEST`]??`sha256:${'a'.repeat(64)}`}])) ;
      const owner = account || 'example-owner';
      return new Response(JSON.stringify({schema_version:1, default_connection_id:`github:${owner.toLowerCase()}`,
        connections:[{id:`github:${owner.toLowerCase()}`, account:owner,account_id:'99', account_type:'organization',
          capabilities:{metadata:true,provisioning:true,lifecycle:true}, credential_bindings:bindings}]}),{status:200});
    }
    return fetchImpl(url,init);
  };
}
