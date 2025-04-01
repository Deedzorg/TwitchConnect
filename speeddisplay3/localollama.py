import subprocess
import tkinter as tk
from tkinter.scrolledtext import ScrolledText
import tkinter.filedialog as fd
import pyttsx3
import threading
import queue
from concurrent.futures import ThreadPoolExecutor

# Initialize TTS engine and queue.
tts_engine = pyttsx3.init()
tts_queue = queue.Queue()

def tts_worker():
    while True:
        text = tts_queue.get()
        if text is None:
            break  # Signal to exit the thread.
        tts_engine.say(text)
        tts_engine.runAndWait()
        tts_queue.task_done()

# Start the dedicated TTS thread as a daemon.
tts_thread = threading.Thread(target=tts_worker, daemon=True)
tts_thread.start()

def run_model(prompt):
    ollama_executable = r"C:\Users\Liams\AppData\Local\Programs\Ollama\ollama.exe"  # Full path to the executable
    try:
        result = subprocess.run(
            [ollama_executable, "run", "gemma3", prompt],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            check=True
        )
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        return "Error: Model response timed out."
    except subprocess.CalledProcessError as e:
        return f"Error: {e}"

def update_conversation(text):
    conversation_text.config(state=tk.NORMAL)
    conversation_text.insert(tk.END, text + "\n")
    conversation_text.config(state=tk.DISABLED)
    conversation_text.see(tk.END)

def get_model_response(user_input):
    response = run_model(user_input)
    print("Debug: Model response:", response)
    root.after(0, update_conversation, "gemma3: " + response)
    # Only queue the TTS if it is not disabled.
    if not disable_tts.get():
        tts_queue.put(response)
    root.after(0, lambda: status_label.config(text=""))

def enable_send():
    send_button.config(state=tk.NORMAL)

def process_input():
    user_input = input_entry.get()
    if user_input.strip():
        conversation_text.config(state=tk.NORMAL)
        conversation_text.insert(tk.END, "You: " + user_input + "\n")
        conversation_text.config(state=tk.DISABLED)
        input_entry.delete(0, tk.END)
        
        status_label.config(text="Waiting for response...")
        send_button.config(state=tk.DISABLED)
        
        future = thread_pool.submit(get_model_response, user_input)
        future.add_done_callback(lambda _: root.after(0, enable_send))

def on_enter(event):
    if send_button['state'] == tk.NORMAL:
        process_input()

# Use a thread pool with one worker to limit concurrent requests.
thread_pool = ThreadPoolExecutor(max_workers=1)

# --- Functions for Chat Menu Commands ---

def save_chat():
    file_path = fd.asksaveasfilename(defaultextension=".txt",
                                     filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")])
    if file_path:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(conversation_text.get("1.0", tk.END))

def clear_chat():
    conversation_text.config(state=tk.NORMAL)
    conversation_text.delete("1.0", tk.END)
    conversation_text.config(state=tk.DISABLED)

def read_all():
    # Get entire conversation text and queue it for TTS.
    text = conversation_text.get("1.0", tk.END).strip()
    if text:
        tts_engine.stop()  # Stop any current speech.
        tts_queue.put(text)

# Create the main window.
root = tk.Tk()
root.title("Ollama Gemma3 Chat")

# --- Dark Mode, TTS Disable, and Voice Options ---
dark_mode_var = tk.BooleanVar(value=False)
disable_tts = tk.BooleanVar(value=False)  # When True, TTS is disabled.

def toggle_dark_mode():
    if dark_mode_var.get():
        root.config(bg="black")
        conversation_text.config(bg="black", fg="white", insertbackground="white")
        input_entry.config(bg="gray20", fg="white", insertbackground="white")
        send_button.config(bg="gray30", fg="white")
        stop_tts_button.config(bg="gray30", fg="white")
        status_label.config(bg="black", fg="white")
    else:
        root.config(bg="SystemButtonFace")
        conversation_text.config(bg="white", fg="black", insertbackground="black")
        input_entry.config(bg="white", fg="black", insertbackground="black")
        send_button.config(bg="SystemButtonFace", fg="black")
        stop_tts_button.config(bg="SystemButtonFace", fg="black")
        status_label.config(bg="SystemButtonFace", fg="black")

def pick_voice():
    # Create a new window to select a voice.
    voice_window = tk.Toplevel(root)
    voice_window.title("Select Voice")
    
    voices = tts_engine.getProperty('voices')
    voice_var = tk.StringVar(value=tts_engine.getProperty('voice'))
    
    def apply_voice():
        selected_voice = voice_var.get()
        tts_engine.setProperty('voice', selected_voice)
        voice_window.destroy()
    
    tk.Label(voice_window, text="Select a voice:").pack(padx=10, pady=10)
    
    # List all available voices.
    for voice in voices:
        voice_text = f"{voice.name} ({voice.id})"
        tk.Radiobutton(voice_window, text=voice_text, variable=voice_var, value=voice.id).pack(anchor="w", padx=10)
    
    apply_button = tk.Button(voice_window, text="Apply", command=apply_voice)
    apply_button.pack(padx=10, pady=10)

def stop_tts():
    # Stop the current TTS utterance and clear any queued items.
    tts_engine.stop()
    while not tts_queue.empty():
        try:
            tts_queue.get_nowait()
            tts_queue.task_done()
        except queue.Empty:
            break

# --- Menu Bar Setup ---
menu_bar = tk.Menu(root)
# Add chat commands directly to the menubar.
menu_bar.add_command(label="Save Chat", command=save_chat)
menu_bar.add_command(label="Clear Chat", command=clear_chat)
menu_bar.add_command(label="Read All", command=read_all)
# Options menu.
options_menu = tk.Menu(menu_bar, tearoff=0)
options_menu.add_checkbutton(label="Dark Mode", variable=dark_mode_var, command=toggle_dark_mode)
options_menu.add_command(label="Select Voice", command=pick_voice)
options_menu.add_checkbutton(label="Disable TTS", variable=disable_tts)
menu_bar.add_cascade(label="Options", menu=options_menu)
root.config(menu=menu_bar)

# --- Conversation Area ---
conversation_text = ScrolledText(root, wrap=tk.WORD, state=tk.DISABLED, width=80, height=20)
conversation_text.pack(padx=10, pady=10, expand=True, fill=tk.BOTH)

# --- Status Label ---
status_label = tk.Label(root, text="", anchor="w")
status_label.pack(fill=tk.X, padx=10, pady=(0, 5))

# --- Input Frame ---
input_frame = tk.Frame(root)
input_frame.pack(padx=10, pady=(0,10), fill=tk.X)

input_entry = tk.Entry(input_frame, width=70)
input_entry.pack(side=tk.LEFT, padx=(0,5), expand=True, fill=tk.X)
input_entry.bind("<Return>", on_enter)

send_button = tk.Button(input_frame, text="Send", command=process_input)
send_button.pack(side=tk.LEFT)

stop_tts_button = tk.Button(input_frame, text="Stop TTS", command=stop_tts)
stop_tts_button.pack(side=tk.LEFT, padx=(5,0))

def on_closing():
    tts_queue.put(None)  # Signal the TTS thread to exit.
    tts_thread.join(timeout=1)
    thread_pool.shutdown(wait=False)
    root.destroy()

root.protocol("WM_DELETE_WINDOW", on_closing)
root.mainloop()
