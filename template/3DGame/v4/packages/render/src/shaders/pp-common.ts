export const quadVS = `#version 300 es
precision highp float;

in vec2 aPos;
in vec2 aUV;

out vec2 vUV;

void main() {
	vUV = aUV;
	gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const copyFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uSrcTex;

out vec4 fragColor;

void main() {
	fragColor = texture(uSrcTex, vUV);
}
`

export const bloomExtractFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uSrcTex;
uniform float uThreshold;

out vec4 fragColor;

void main() {
	vec4 clr = texture(uSrcTex, vUV);
	float brightness = dot(clr.rgb, vec3(0.2126, 0.7152, 0.0722));
	if (brightness > uThreshold) {
		fragColor = clr;
	} else {
		fragColor = vec4(0.0);
	}
}
`

export const bloomBlurFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uSrcTex;
uniform vec2 uDir;

out vec4 fragColor;

const float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

void main() {
	vec2 texelSize = uDir;
	vec3 result = texture(uSrcTex, vUV).rgb * weights[0];
	for (int i = 1; i < 5; i++) {
		result += texture(uSrcTex, vUV + texelSize * float(i)).rgb * weights[i];
		result += texture(uSrcTex, vUV - texelSize * float(i)).rgb * weights[i];
	}
	fragColor = vec4(result, 1.0);
}
`

export const bloomCompositeFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uSrcTex;
uniform sampler2D uBloomTex;
uniform float uBloomIntensity;

out vec4 fragColor;

void main() {
	vec3 srcClr = texture(uSrcTex, vUV).rgb;
	vec3 bloomClr = texture(uBloomTex, vUV).rgb;
	fragColor = vec4(srcClr + bloomClr * uBloomIntensity, 1.0);
}
`

export const tonemapFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uSrcTex;
uniform float uExposure;
uniform float uGamma;

out vec4 fragColor;

vec3 acesTonemap(vec3 x) {
	const float a = 2.51;
	const float b = 0.03;
	const float c = 2.43;
	const float d = 0.59;
	const float e = 0.14;
	return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
	vec3 clr = texture(uSrcTex, vUV).rgb;
	clr *= uExposure;
	clr = acesTonemap(clr);
	clr = pow(clr, vec3(1.0 / uGamma));
	fragColor = vec4(clr, 1.0);
}
`
