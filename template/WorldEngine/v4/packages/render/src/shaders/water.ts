export const waterVS = `#version 300 es
precision highp float;

in vec3 aPos;
in vec3 aNom;
in vec2 aUV;
in vec3 aClr;
in float aAO;

uniform mat4 uViewProj;
uniform mat4 uModel;
uniform float uTime;

out vec3 vPos;
out vec3 vNom;
out vec2 vUV;
out vec3 vClr;
out float vAO;
out vec3 vWorldPos;

void main() {
	vec4 worldPos = uModel * vec4(aPos, 1.0);
	float wave1 = sin(worldPos.x * 0.1 + uTime * 2.0) * 0.15;
	float wave2 = sin(worldPos.y * 0.08 + uTime * 1.5) * 0.1;
	float wave3 = sin((worldPos.x + worldPos.y) * 0.05 + uTime * 1.0) * 0.08;
	worldPos.z += wave1 + wave2 + wave3;
	vWorldPos = worldPos.xyz;
	vPos = worldPos.xyz;
	float dx = cos(worldPos.x * 0.1 + uTime * 2.0) * 0.015 + cos((worldPos.x + worldPos.y) * 0.05 + uTime * 1.0) * 0.004;
	float dy = cos(worldPos.y * 0.08 + uTime * 1.5) * 0.008 + cos((worldPos.x + worldPos.y) * 0.05 + uTime * 1.0) * 0.004;
	vNom = normalize(vec3(-dx, -dy, 1.0));
	vUV = aUV;
	vClr = aClr;
	vAO = aAO;
	gl_Position = uViewProj * worldPos;
}
`

export const waterFS = `#version 300 es
precision highp float;

in vec3 vPos;
in vec3 vNom;
in vec2 vUV;
in vec3 vClr;
in float vAO;
in vec3 vWorldPos;

uniform vec3 uAmbient;
uniform vec3 uSunDir;
uniform vec3 uSunClr;
uniform vec3 uCamPos;
uniform float uTime;
uniform int uRndMode;
uniform float uSpecPower;
uniform float uRimPower;
uniform float uSmoothness;
uniform float uSteps;

out vec4 fragColor;

vec4 calRealisticWater(vec3 nom, vec3 viewDir, vec3 sunDir, float diff) {
	vec3 reflDir = reflect(-sunDir, nom);
	float spec = pow(max(dot(viewDir, reflDir), 0.0), uSpecPower * 2.0);
	float fresnel = pow(1.0 - max(dot(viewDir, nom), 0.0), 3.0);
	fresnel = mix(0.02, 1.0, fresnel);
	vec3 waterClr = vec3(0.1, 0.3, 0.5);
	vec3 skyClr = vec3(0.5, 0.7, 0.9);
	vec3 reflClr = mix(waterClr, skyClr, fresnel);
	float caustic = sin(vWorldPos.x * 0.5 + uTime * 3.0) * sin(vWorldPos.y * 0.5 + uTime * 2.5) * 0.1 + 0.9;
	vec3 light = uAmbient + uSunClr * diff;
	vec3 clr = reflClr * light * caustic + uSunClr * spec * 0.5;
	float alpha = mix(0.7, 0.95, fresnel);
	return vec4(clr, alpha);
}

vec4 calAcrylicWater(vec3 nom, vec3 viewDir, vec3 sunDir, float diff) {
	float wrap = (diff + 1.0) * 0.5;
	float rim = pow(1.0 - max(dot(viewDir, nom), 0.0), uRimPower);
	vec3 waterClr = vec3(0.2, 0.5, 0.7);
	vec3 lightClr = vec3(0.6, 0.85, 1.0);
	vec3 clr = mix(waterClr, lightClr, smoothstep(0.2 - uSmoothness * 0.15, 0.8 + uSmoothness * 0.15, wrap));
	clr += rim * vec3(0.8, 0.9, 1.0) * 0.4;
	vec3 reflDir = reflect(-sunDir, nom);
	float spec = pow(max(dot(viewDir, reflDir), 0.0), 32.0);
	clr += uSunClr * spec * 0.3;
	return vec4(clr, 0.75);
}

vec4 calAnimeWater(vec3 nom, vec3 viewDir, vec3 sunDir, float diff) {
	float steps = max(uSteps, 2.0);
	float toon = floor(diff * steps + 0.5) / steps;
	vec3 waterClr = vec3(0.15, 0.4, 0.6);
	vec3 lightClr = vec3(0.4, 0.7, 0.9);
	vec3 clr = mix(waterClr, lightClr, toon);
	vec3 reflDir = reflect(-sunDir, nom);
	float spec = pow(max(dot(viewDir, reflDir), 0.0), 16.0);
	float specToon = step(0.5, spec);
	clr += uSunClr * specToon * 0.4;
	return vec4(clr, 0.8);
}

void main() {
	vec3 nom = normalize(vNom);
	vec3 viewDir = normalize(uCamPos - vWorldPos);
	vec3 sunDir = normalize(uSunDir);
	float diff = max(dot(nom, sunDir), 0.0);
	vec4 result;
	if (uRndMode == 0) {
		result = calRealisticWater(nom, viewDir, sunDir, diff);
	} else if (uRndMode == 1) {
		result = calAcrylicWater(nom, viewDir, sunDir, diff);
	} else {
		result = calAnimeWater(nom, viewDir, sunDir, diff);
	}
	fragColor = result;
}
`
