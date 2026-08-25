class MailTemplate:
    def __init__(self, mailtemplate):
        self.mailtemplate = mailtemplate

# Example usage
def otpEmailMessage(otp):
    return f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificação de Email - RedUCM</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
                -webkit-text-size-adjust: none;
                -ms-text-size-adjust: none;
            }}
            .container {{
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                text-align: center;
                padding: 10px 0;
                border-bottom: 1px solid #dddddd;
            }}
            .header h1 {{
                margin: 0;
                color: #333333;
            }}
            .content {{
                padding: 20px 0;
                text-align: center;
            }}
            .content p {{
                font-size: 16px;
                color: #666666;
                margin: 10px 0;
            }}
            .otp-code {{
                font-size: 24px;
                font-weight: bold;
                color: #4CAF50;
                letter-spacing: 2px;
                margin: 20px 0;
            }}
            .footer {{
                text-align: center;
                padding: 10px 0;
                border-top: 1px solid #dddddd;
                margin-top: 20px;
            }}
            .footer p {{
                font-size: 12px;
                color: #999999;
                margin: 5px 0;
            }}
        </style>
    </head>
    <body>
    
        <div class="container">
            <div class="header">
                <img style="width:150px" src="https://www.lispolis.pt/wp-content/uploads/2023/08/redshift.png">
                <h1>Verificação de Email</h1>

            </div>
            <div class="content">
                <p>Olá,</p>
                <p>O seu código de verificação é:</p>
                <p class="otp-code">{otp}</p>
                <p>Por favor, insira este código para confirmar o seu login.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 RedUCM. Todos os direitos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    """



