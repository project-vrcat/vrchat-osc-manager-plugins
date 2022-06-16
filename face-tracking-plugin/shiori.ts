// deno-lint-ignore-file

export class ShioriData {
  eyeX: number;
  eyeY: number;
  eyeLOpen: number;
  eyeROpen: number;
  mouthOpen: number;
  mouthForm: number;

  constructor(data: any) {
    const info = JSON.parse(new TextDecoder().decode(data));
    this.eyeX = parseFloat(info.xs ? info.eX : info.EyeX);
    this.eyeY = parseFloat(info.xs ? info.eY : info.EyeY);
    this.eyeLOpen = parseFloat(info.xs ? info.eLO : info.eyeLOpen);
    this.eyeROpen = parseFloat(info.xs ? info.eRO : info.eyeROpen);
    this.mouthOpen = parseFloat(info.xs ? info.mO : info.mouthOpenY);
    this.mouthForm = parseFloat(info.xs ? info.mF : info.mouthFormY);
    this.mouthForm > 1 && (this.mouthForm = 1);
    this.mouthForm < -1 && (this.mouthForm = -1);
  }
}
