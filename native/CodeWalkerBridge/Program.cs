using System.Collections;
using System.Reflection;
using System.Runtime.Loader;
using System.Security.Cryptography;
using System.Text.Json;

// Original adapter. The GPL grzyClothTool CodeWalker core is bundled with source.
// GTA data remains local; the game installation is never modified.
var output=Console.Out;
try {
    var input=await Console.In.ReadToEndAsync();
    if(input.Length>120*1024*1024)throw new Exception("Requisição nativa acima do limite.");
    using var request=JsonDocument.Parse(input);
    var root=request.RootElement;
    string Text(string name)=>root.GetProperty(name).GetString()??throw new Exception($"Campo {name} ausente.");
    var directory=Path.GetFullPath(Text("codewalkerDirectory"));
    var dll=Path.Combine(directory,"CodeWalker.Core.dll");
    if(!File.Exists(dll))throw new Exception("CodeWalker.Core.dll não encontrado na pasta selecionada.");
    AssemblyLoadContext.Default.Resolving+=(_,name)=> {
        if(name.Name is null||Path.GetFileName(name.Name)!=name.Name)return null;
        var candidate=Path.Combine(directory,name.Name+".dll");
        return File.Exists(candidate)?AssemblyLoadContext.Default.LoadFromAssemblyPath(candidate):null;
    };
    var assembly=AssemblyLoadContext.Default.LoadFromAssemblyPath(dll);
    Type Type(string name)=>assembly.GetType("CodeWalker.GameFiles."+name,true)!;
    object? Read(object obj,string name)=>obj.GetType().GetProperty(name)?.GetValue(obj)??obj.GetType().GetField(name)?.GetValue(obj);
    object? Call(object obj,string name,params object?[] args)=>obj.GetType().GetMethods().First(m=>m.Name==name&&!m.IsGenericMethod&&m.GetParameters().Length==args.Length).Invoke(obj,args);
    Console.SetOut(TextWriter.Null); // Library diagnostics must not corrupt the JSON protocol.
    var yddType=Type("YddFile");var rpfType=Type("RpfFile");
    var command=Text("command");object result;
    if(command=="probe") {
        _=Type("GTA5Keys");
        result=new {ok=true,version=assembly.GetName().Version?.ToString(),capabilities=new[]{"ped-base-rpf","ydd-roundtrip"}};
    } else if(command=="roundtrip") {
        var bytes=Convert.FromBase64String(Text("data"));
        if(bytes.Length>80*1024*1024)throw new Exception("YDD acima de 80 MB.");
        var file=Activator.CreateInstance(yddType)!;Call(file,"Load",bytes);
        var before=(Read(file,"Drawables") as Array)?.Length??0;
        var saved=(byte[])Call(file,"Save")!;
        var reopened=Activator.CreateInstance(yddType)!;Call(reopened,"Load",saved);
        if(((Read(reopened,"Drawables") as Array)?.Length??0)!=before)throw new Exception("Round-trip alterou a contagem de drawables.");
        result=new {ok=true,drawables=before,data=Convert.ToBase64String(saved),sha256=Convert.ToHexString(SHA256.HashData(saved)).ToLowerInvariant()};
    } else if(command=="ped") {
        var gender=Text("gender");if(gender!="male"&&gender!="female")throw new Exception("Gênero inválido.");
        var game=Path.GetFullPath(Text("gameDirectory"));
        if(!File.Exists(Path.Combine(game,"GTA5.exe"))||!File.Exists(Path.Combine(game,"x64v.rpf")))
            throw new Exception("Selecione a instalação GTA V Legacy com GTA5.exe e x64v.rpf. Enhanced não é suportado.");
        var loadKeys=Type("GTA5Keys").GetMethods().First(m=>m.Name=="LoadFromPath");
        var keyArgs=loadKeys.GetParameters().Select((parameter,index)=>index==0?(object?)game:
            parameter.ParameterType==typeof(bool)?false:parameter.HasDefaultValue?parameter.DefaultValue:null).ToArray();
        loadKeys.Invoke(null,keyArgs);
        var rpf=Activator.CreateInstance(rpfType,new object[]{Path.Combine(game,"x64v.rpf"),"x64v.rpf"})!;
        var errors=new List<string>();Action<string> progress=_=>{};Action<string> error=message=>errors.Add(message);
        Call(rpf,"ScanStructure",progress,error);
        if(Read(rpf,"Root") is null)throw new Exception("Não foi possível ler x64v.rpf com o CodeWalker selecionado.");
        var ped=gender=="male"?"mp_m_freemode_01":"mp_f_freemode_01";
        var entries=new List<object>();
        void Walk(object archive) {
            if(Read(archive,"AllEntries") is IEnumerable all)foreach(var entry in all) {
                var name=(Read(entry,"Name") as string??"").ToLowerInvariant();
                var path=(Read(entry,"Path") as string??"").Replace('/','\\').ToLowerInvariant();
                if(name.EndsWith(".ydd")&&path.Contains("\\"+ped+"\\"))entries.Add(entry);
            }
            if(Read(archive,"Children") is IEnumerable children)foreach(var child in children)Walk(child);
        }
        Walk(rpf);
        var defaults=new Dictionary<string,string>{{"head","head_000_r.ydd"},{"uppr","uppr_015_r.ydd"},{"lowr","lowr_014_r.ydd"},{"feet","feet_034_u.ydd"},{"hand","hand_000_r.ydd"}};
        var assets=new List<object>();var missing=new List<string>();long total=0;
        var getter=rpfType.GetMethods().First(m=>m.Name=="GetFile"&&m.IsGenericMethodDefinition&&m.GetParameters().Length==1).MakeGenericMethod(yddType);
        foreach(var pair in defaults) {
            var candidates=entries.Where(e=>(Read(e,"Name") as string??"").StartsWith(pair.Key+"_",StringComparison.OrdinalIgnoreCase)).OrderBy(e=>Read(e,"Name") as string).ToList();
            var entry=candidates.FirstOrDefault(e=>string.Equals(Read(e,"Name") as string,pair.Value,StringComparison.OrdinalIgnoreCase))??candidates.FirstOrDefault();
            if(entry is null){missing.Add(pair.Key);continue;}
            var file=getter.Invoke(null,new[]{entry})??throw new Exception("Falha ao ler componente do ped.");
            var data=(byte[])Call(file,"Save")!;total+=data.Length;
            if(data.Length>80*1024*1024||total>200*1024*1024)throw new Exception("Ped acima do limite de memória do preview.");
            assets.Add(new {name=Read(entry,"Name"),data=Convert.ToBase64String(data)});
        }
        if(assets.Count==0)throw new Exception("Nenhum componente base do ped encontrado. Confira a instalação e a versão do CodeWalker.");
        result=new {ok=true,ped,assets,missing,pose="static-bind-pose",source="GTA V Legacy x64v.rpf (base game)"};
    } else throw new Exception("Comando nativo não suportado.");
    output.WriteLine(JsonSerializer.Serialize(result));
} catch(Exception exception) {
    while(exception is TargetInvocationException&&exception.InnerException is not null)exception=exception.InnerException;
    output.WriteLine(JsonSerializer.Serialize(new {ok=false,error=exception.Message}));Environment.ExitCode=1;
}
