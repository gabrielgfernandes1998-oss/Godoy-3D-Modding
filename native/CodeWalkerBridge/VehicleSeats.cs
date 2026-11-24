using CodeWalker.GameFiles;
using SharpDX;

internal static class VehicleSeats
{
    internal static byte[] Export(byte[] bytes, string donor, string name, string door, float[] position)
    {
        if (position.Length != 3 || position.Any(n => !float.IsFinite(n) || Math.Abs(n) > 100))
            throw new InvalidDataException("Posição de assento inválida.");
        var file = new YftFile();
        file.Load(bytes);
        var fragment = file.Fragment ?? throw new InvalidDataException("YFT sem fragmento.");
        var main = fragment.Drawable?.Skeleton ?? throw new InvalidDataException("YFT sem esqueleto principal.");
        var skeletons = (fragment.DrawableArray?.data_items ?? Array.Empty<FragDrawable>())
            .Append(fragment.DrawableCloth).Append(fragment.Drawable)
            .Select(drawable => drawable?.Skeleton).OfType<Skeleton>().Distinct().ToList();
        if (!skeletons.Contains(main)) skeletons.Add(main);
        var world = new Vector3(position[0], -position[2], position[1]);
        var originalCount = main.Bones.Items.Length;
        if (!main.Bones.Items.Any(bone => string.Equals(bone.Name, door, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidDataException($"Osso da porta de acesso ausente: {door}.");
        int sourceIndex = Array.FindIndex(main.Bones.Items, bone => string.Equals(bone.Name, donor, StringComparison.OrdinalIgnoreCase));
        if (sourceIndex < 0) throw new InvalidDataException($"Osso do assento base ausente: {donor}.");
        var tag = Bone.CalculateBoneHash(name);
        foreach (var skeleton in skeletons)
        {
            var bones = skeleton.Bones?.Items;
            if (bones is null) continue;
            var source = Array.Find(bones, bone => string.Equals(bone.Name, donor, StringComparison.OrdinalIgnoreCase));
            if (source is null) continue;
            AddBone(skeleton, bones, source, name, tag, world);
        }
        if (fragment.BoneTransforms?.Items is { Length: > 0 } transforms)
        {
            if (transforms.Length != originalCount || originalCount >= byte.MaxValue)
                throw new InvalidDataException("Tabela de transformações YFT incompatível com a inclusão do assento.");
            var transform = transforms[sourceIndex];
            var dx = world - main.Bones.Items[sourceIndex].AbsTransform.TranslationVector;
            var raw = transform.ToArray();
            raw[3] += dx.X;
            raw[7] += dx.Y;
            raw[11] += dx.Z;
            fragment.BoneTransforms.Items = transforms.Append(new Matrix3_s(raw)).ToArray();
            fragment.BoneTransforms.ItemCount1 = fragment.BoneTransforms.ItemCount2 = (byte)(originalCount + 1);
        }
        var output = file.Save();
        var check = new YftFile();
        check.Load(output);
        var verified = check.Fragment?.Drawable?.Skeleton?.Bones?.Items;
        if (verified is null || verified.Length != originalCount + 1 ||
            !string.Equals(verified[^1].Name, name, StringComparison.Ordinal) || verified[^1].Tag != tag ||
            (verified[^1].AbsTransform.TranslationVector - world).Length() > 0.001f)
            throw new InvalidDataException("A posição ou o vínculo do novo assento divergiu ao reabrir o YFT exportado.");
        return output;
    }

    private static void AddBone(Skeleton skeleton, Bone[] bones, Bone donor, string name, ushort tag, Vector3 world)
    {
        if (bones.Length >= 255 || bones.Any(b => b.Tag == tag || string.Equals(b.Name, name, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidDataException("O nome/tag do assento já existe ou o esqueleto atingiu o limite.");
        for (int i = 0; i < bones.Length; i++)
            if (bones[i].Index != i || bones[i].ParentIndex >= i || bones[i].ParentIndex < -1)
                throw new InvalidDataException("Hierarquia de ossos fora de ordem neste YFT.");
        var parent = donor.Parent;
        var local = parent is null ? world : Vector3.TransformCoordinate(world, Matrix.Invert(parent.AbsTransform));
        var bone = new Bone
        {
            Name = name, Tag = tag, Index = (short)bones.Length, Index2 = (short)bones.Length,
            ParentIndex = donor.ParentIndex, NextSiblingIndex = -1, Parent = parent,
            TransformUnk = donor.TransformUnk,
            Translation = local, Rotation = donor.Rotation, Scale = donor.Scale, Flags = donor.Flags,
            Unknown_1Ch = donor.Unknown_1Ch, Unknown_2Ch = donor.Unknown_2Ch,
            AnimTranslation = local, AnimRotation = donor.Rotation, AnimScale = donor.Scale,
        };
        var sibling = bones.LastOrDefault(b => b.ParentIndex == donor.ParentIndex && b.NextSiblingIndex < 0);
        if (sibling is not null && parent is not null) sibling.NextSiblingIndex = bone.Index;
        skeleton.Bones.Items = bones.Append(bone).ToArray();
        skeleton.Bones.Count = (uint)skeleton.Bones.Items.Length;
        skeleton.BuildIndices();
        skeleton.BuildBoneTags();
        skeleton.AssignBoneParents();
        skeleton.BuildTransformations();
        skeleton.BuildBonesMap();
    }
}
