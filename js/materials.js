ITEM.MATERIAL = {
    backStencil: new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0x00ff00) },
            clippingPlaneNormal: { value: new THREE.Vector3(0, 1, 0) },
            clippingPlaneDistance: { value: 0.0 },
            clippingPlanePosition: {value: new THREE.Vector3(0, 0, 0) }
        },
        vertexShader: ITEM.SHADER.vertex,
        fragmentShader: ITEM.SHADER.fragment,
        colorWrite: false,
        depthWrite: false,
        depthTest: false,
        side: THREE.BackSide,
    }),

    frontStencil: new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xff0000) },
            clippingPlaneNormal: { value: new THREE.Vector3(0, 1, 0) },
            clippingPlaneDistance: { value: 0.0 },
            clippingPlanePosition: {value: new THREE.Vector3(0, 0, 0) }
        },
        vertexShader: ITEM.SHADER.vertex,
        fragmentShader: ITEM.SHADER.fragment,
        colorWrite: false,
        depthWrite: false,
        depthTest: false,
        side: THREE.FrontSide
    }),

    clipping: new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0x000000) },
            clippingPlaneNormal: { value: new THREE.Vector3(0, 1, 0) },
            clippingPlaneDistance: { value: 0.0 },
            clippingPlanePosition: {value: new THREE.Vector3(0, 0, 0) }
        },
        vertexShader: ITEM.SHADER.vertex,
        fragmentShader: ITEM.SHADER.fragment,
        colorWrite: true,
        side: THREE.DoubleSide
    }),

    cap: new THREE.ShaderMaterial({
        uniforms:{
            color: { type: "c", value: new THREE.Color( 0xf83610 ) }
        },
        vertexShader:   ITEM.SHADER.vertexClipping,
		fragmentShader: ITEM.SHADER.fragmentClipping,
        colorWrite: true,
        side: THREE.DoubleSide
    })
}