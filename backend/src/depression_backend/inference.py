def predict(audio: bytes, transcript: bytes | None, pid: str) -> int:
    """回傳 0 = 無憂鬱、1 = 憂鬱。

    目前為模擬推論(同 App 端 mockup:身分證字號第一個字元的奇偶決定結果)。
    接上真實 PyTorch 模型時只需替換這個函式。
    """
    return ord(pid[0]) % 2
